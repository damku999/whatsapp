<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ContactGroupController extends Controller
{
    /**
     * List groups with contact count.
     */
    public function index(Request $request)
    {
        $groups = ContactGroup::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->input('search') . '%');
            })
            ->withCount('contacts')
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Groups/Index', [
            'groups' => $groups,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Create a new group.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('contact_groups', 'name')->where('user_id', Auth::id()),
            ],
            'description' => 'nullable|string|max:1000',
        ]);

        ContactGroup::create($validated);

        return redirect()->back()->with('success', 'Group created successfully.');
    }

    /**
     * Show a group with its members.
     */
    public function show(ContactGroup $group)
    {
        $group->loadCount('contacts');

        $members = $group->contacts()
            ->latest('contact_group_members.created_at')
            ->paginate(25);

        // Get contacts not in this group for the "add members" picker
        $availableContacts = Contact::whereDoesntHave('groups', function ($q) use ($group) {
            $q->where('contact_groups.id', $group->id);
        })
            ->select('id', 'name', 'phone')
            ->orderBy('name')
            ->limit(200)
            ->get();

        return Inertia::render('Groups/Show', [
            'group' => $group,
            'members' => $members,
            'availableContacts' => $availableContacts,
        ]);
    }

    /**
     * Update group details.
     */
    public function update(Request $request, ContactGroup $group)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('contact_groups', 'name')
                    ->where('user_id', Auth::id())
                    ->ignore($group->id),
            ],
            'description' => 'nullable|string|max:1000',
        ]);

        $group->update($validated);

        return redirect()->back()->with('success', 'Group updated successfully.');
    }

    /**
     * Delete a group (does not delete the contacts themselves).
     */
    public function destroy(ContactGroup $group)
    {
        $group->contacts()->detach();
        $group->delete();

        return redirect()->route('groups.index')->with('success', 'Group deleted successfully.');
    }

    /**
     * Add contacts to a group.
     */
    public function addMembers(Request $request, ContactGroup $group)
    {
        $validated = $request->validate([
            'contact_ids' => 'required|array|min:1',
            'contact_ids.*' => 'integer|exists:contacts,id',
        ]);

        // Ensure the contacts belong to the authenticated user via the global scope
        $validContactIds = Contact::whereIn('id', $validated['contact_ids'])
            ->pluck('id')
            ->toArray();

        $group->contacts()->syncWithoutDetaching($validContactIds);
        $group->updateContactCount();

        $count = count($validContactIds);

        return redirect()->back()->with('success', "{$count} contact(s) added to group.");
    }

    /**
     * Remove a contact from a group.
     */
    public function removeMember(ContactGroup $group, Contact $contact)
    {
        $group->contacts()->detach($contact->id);
        $group->updateContactCount();

        return redirect()->back()->with('success', 'Contact removed from group.');
    }
}
