<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ContactController extends Controller
{
    /**
     * List contacts with search, tag filter, and pagination.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Contact::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->input('search');
                $q->where(function ($sub) use ($search) {
                    $sub->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('tag'), function ($q) use ($request) {
                $q->whereJsonContains('tags', $request->input('tag'));
            })
            ->when($request->filled('opted_out'), function ($q) use ($request) {
                $q->where('opted_out', filter_var($request->input('opted_out'), FILTER_VALIDATE_BOOLEAN));
            })
            ->when($request->filled('group_id'), function ($q) use ($request) {
                $q->whereHas('groups', function ($sub) use ($request) {
                    $sub->where('contact_groups.id', $request->input('group_id'));
                });
            })
            ->latest();

        $contacts = $query->paginate(25)->withQueryString();

        $groups = ContactGroup::select('id', 'name', 'contact_count')->get();

        // Collect all unique tags for the filter dropdown
        $allTags = Contact::whereNotNull('tags')
            ->pluck('tags')
            ->flatten()
            ->unique()
            ->values();

        return Inertia::render('Contacts/Index', [
            'contacts' => $contacts,
            'groups' => $groups,
            'allTags' => $allTags,
            'filters' => $request->only(['search', 'tag', 'opted_out', 'group_id']),
        ]);
    }

    /**
     * Store a single contact.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => [
                'required',
                'string',
                'max:20',
                Rule::unique('contacts', 'phone')->where('user_id', Auth::id()),
            ],
            'email' => 'nullable|email|max:255',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'custom_fields_json' => 'nullable|array',
        ]);

        $contact = Contact::create($validated);

        return redirect()->back()->with('success', 'Contact created successfully.');
    }

    /**
     * Update an existing contact.
     */
    public function update(Request $request, Contact $contact)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => [
                'required',
                'string',
                'max:20',
                Rule::unique('contacts', 'phone')
                    ->where('user_id', Auth::id())
                    ->ignore($contact->id),
            ],
            'email' => 'nullable|email|max:255',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'custom_fields_json' => 'nullable|array',
        ]);

        $contact->update($validated);

        return redirect()->back()->with('success', 'Contact updated successfully.');
    }

    /**
     * Delete a contact.
     */
    public function destroy(Contact $contact)
    {
        $contact->groups()->detach();
        $contact->delete();

        return redirect()->back()->with('success', 'Contact deleted successfully.');
    }

    /**
     * Import contacts from a CSV file.
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
            'duplicate_action' => 'nullable|in:skip,update',
        ]);

        $duplicateAction = $request->input('duplicate_action', 'skip');
        $userId = Auth::id();

        $file = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            return redirect()->back()->withErrors(['file' => 'Unable to read the uploaded file.']);
        }

        // Read header row
        $header = fgetcsv($handle);

        if ($header === false) {
            fclose($handle);
            return redirect()->back()->withErrors(['file' => 'CSV file is empty.']);
        }

        $header = array_map(fn ($col) => strtolower(trim($col)), $header);

        // Map expected columns
        $nameIdx = array_search('name', $header);
        $phoneIdx = array_search('phone', $header);
        $emailIdx = array_search('email', $header);
        $tagsIdx = array_search('tags', $header);

        if ($phoneIdx === false) {
            fclose($handle);
            return redirect()->back()->withErrors(['file' => 'CSV must contain a "phone" column.']);
        }

        $report = ['total' => 0, 'created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];
        $rowNumber = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;
            $report['total']++;

            $phone = isset($row[$phoneIdx]) ? trim($row[$phoneIdx]) : null;

            if (empty($phone)) {
                $report['errors'][] = "Row {$rowNumber}: Phone number is required.";
                continue;
            }

            $name = ($nameIdx !== false && isset($row[$nameIdx])) ? trim($row[$nameIdx]) : '';
            $email = ($emailIdx !== false && isset($row[$emailIdx])) ? trim($row[$emailIdx]) : null;
            $tags = null;

            if ($tagsIdx !== false && isset($row[$tagsIdx]) && trim($row[$tagsIdx]) !== '') {
                $tags = array_map('trim', explode('|', $row[$tagsIdx]));
            }

            // Validate email if provided
            if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $report['errors'][] = "Row {$rowNumber}: Invalid email '{$email}'.";
                continue;
            }

            $existing = Contact::withoutGlobalScopes()
                ->where('user_id', $userId)
                ->where('phone', $phone)
                ->first();

            if ($existing) {
                if ($duplicateAction === 'update') {
                    $existing->update(array_filter([
                        'name' => $name ?: $existing->name,
                        'email' => $email ?? $existing->email,
                        'tags' => $tags ?? $existing->tags,
                    ]));
                    $report['updated']++;
                } else {
                    $report['skipped']++;
                }
            } else {
                Contact::create([
                    'user_id' => $userId,
                    'name' => $name ?: 'Unknown',
                    'phone' => $phone,
                    'email' => $email,
                    'tags' => $tags,
                ]);
                $report['created']++;
            }
        }

        fclose($handle);

        return redirect()->back()->with('success', "Import complete: {$report['created']} created, {$report['updated']} updated, {$report['skipped']} skipped.")
            ->with('importReport', $report);
    }

    /**
     * Export contacts as a CSV download.
     */
    public function export(Request $request): StreamedResponse
    {
        $query = Contact::query()
            ->when($request->filled('tag'), function ($q) use ($request) {
                $q->whereJsonContains('tags', $request->input('tag'));
            })
            ->when($request->filled('group_id'), function ($q) use ($request) {
                $q->whereHas('groups', function ($sub) use ($request) {
                    $sub->where('contact_groups.id', $request->input('group_id'));
                });
            })
            ->orderBy('name');

        $fileName = 'contacts_' . now()->format('Y-m-d_His') . '.csv';

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Name', 'Phone', 'Email', 'Tags', 'Opted Out', 'Created At']);

            $query->chunk(500, function ($contacts) use ($handle) {
                foreach ($contacts as $contact) {
                    fputcsv($handle, [
                        $contact->name,
                        $contact->phone,
                        $contact->email ?? '',
                        is_array($contact->tags) ? implode('|', $contact->tags) : '',
                        $contact->opted_out ? 'Yes' : 'No',
                        $contact->created_at->toDateTimeString(),
                    ]);
                }
            });

            fclose($handle);
        }, $fileName, [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * Toggle opt-out status for a contact.
     */
    public function optOut(Contact $contact)
    {
        $contact->update([
            'opted_out' => !$contact->opted_out,
            'opted_out_at' => !$contact->opted_out ? now() : null,
        ]);

        $status = $contact->opted_out ? 'opted out' : 'opted back in';

        return redirect()->back()->with('success', "Contact {$status} successfully.");
    }

    /**
     * Perform bulk actions on multiple contacts.
     */
    public function bulkAction(Request $request)
    {
        $validated = $request->validate([
            'action' => 'required|in:delete,add_tag,remove_tag,add_to_group',
            'contact_ids' => 'required|array|min:1',
            'contact_ids.*' => 'integer|exists:contacts,id',
            'tag' => 'required_if:action,add_tag,remove_tag|nullable|string|max:50',
            'group_id' => 'required_if:action,add_to_group|nullable|integer|exists:contact_groups,id',
        ]);

        $userId = Auth::id();

        // Ensure all contacts belong to the authenticated user
        $contacts = Contact::whereIn('id', $validated['contact_ids'])->get();

        $count = $contacts->count();

        if ($count === 0) {
            return redirect()->back()->withErrors(['contact_ids' => 'No valid contacts found.']);
        }

        switch ($validated['action']) {
            case 'delete':
                foreach ($contacts as $contact) {
                    $contact->groups()->detach();
                    $contact->delete();
                }
                return redirect()->back()->with('success', "{$count} contacts deleted.");

            case 'add_tag':
                $tag = $validated['tag'];
                foreach ($contacts as $contact) {
                    $tags = $contact->tags ?? [];
                    if (!in_array($tag, $tags, true)) {
                        $tags[] = $tag;
                        $contact->update(['tags' => $tags]);
                    }
                }
                return redirect()->back()->with('success', "Tag '{$tag}' added to {$count} contacts.");

            case 'remove_tag':
                $tag = $validated['tag'];
                foreach ($contacts as $contact) {
                    $tags = $contact->tags ?? [];
                    $tags = array_values(array_filter($tags, fn ($t) => $t !== $tag));
                    $contact->update(['tags' => $tags]);
                }
                return redirect()->back()->with('success', "Tag '{$tag}' removed from {$count} contacts.");

            case 'add_to_group':
                $group = ContactGroup::findOrFail($validated['group_id']);
                $contactIds = $contacts->pluck('id')->toArray();
                $group->contacts()->syncWithoutDetaching($contactIds);
                $group->updateContactCount();
                return redirect()->back()->with('success', "{$count} contacts added to group '{$group->name}'.");
        }

        return redirect()->back();
    }
}
