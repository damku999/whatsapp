<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContactController extends Controller
{
    /**
     * List contacts with search, filter, and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
            'search' => 'nullable|string|max:255',
            'name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'tag' => 'nullable|string|max:100',
            'opted_out' => 'nullable|in:0,1,true,false',
            'sort_by' => 'nullable|in:name,phone,created_at,updated_at',
            'sort_dir' => 'nullable|in:asc,desc',
        ]);

        $query = $request->user()->contacts();

        // General search across name and phone
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Specific field filters
        if ($name = $request->input('name')) {
            $query->where('name', 'like', "%{$name}%");
        }

        if ($phone = $request->input('phone')) {
            $query->where('phone', 'like', "%{$phone}%");
        }

        if ($tag = $request->input('tag')) {
            $query->whereJsonContains('tags', $tag);
        }

        if ($request->has('opted_out')) {
            $optedOut = filter_var($request->input('opted_out'), FILTER_VALIDATE_BOOLEAN);
            $query->where('opted_out', $optedOut);
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        $perPage = (int) $request->input('per_page', 50);
        $contacts = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $contacts,
            'message' => 'Contacts retrieved successfully.',
        ]);
    }

    /**
     * Create a new contact with full validation.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => [
                'required',
                'string',
                'max:20',
                'regex:/^\+?[1-9]\d{6,14}$/',
                Rule::unique('contacts')->where(function ($query) use ($request) {
                    return $query->where('user_id', $request->user()->id);
                }),
            ],
            'email' => 'nullable|email|max:255',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:100',
            'custom_fields_json' => 'nullable|array',
        ]);

        $validated['user_id'] = $request->user()->id;

        $contact = $request->user()->contacts()->create($validated);

        return response()->json([
            'success' => true,
            'data' => $contact,
            'message' => 'Contact created successfully.',
        ], 201);
    }

    /**
     * Show a single contact.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $contact = $request->user()->contacts()->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $contact->load('groups'),
            'message' => 'Contact retrieved successfully.',
        ]);
    }

    /**
     * Update a contact with full validation.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $contact = $request->user()->contacts()->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                'regex:/^\+?[1-9]\d{6,14}$/',
                Rule::unique('contacts')->where(function ($query) use ($request) {
                    return $query->where('user_id', $request->user()->id);
                })->ignore($contact->id),
            ],
            'email' => 'nullable|email|max:255',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:100',
            'custom_fields_json' => 'nullable|array',
            'opted_out' => 'nullable|boolean',
        ]);

        if (isset($validated['opted_out']) && $validated['opted_out'] && !$contact->opted_out) {
            $validated['opted_out_at'] = now();
        } elseif (isset($validated['opted_out']) && !$validated['opted_out']) {
            $validated['opted_out_at'] = null;
        }

        $contact->update($validated);

        return response()->json([
            'success' => true,
            'data' => $contact->fresh(),
            'message' => 'Contact updated successfully.',
        ]);
    }

    /**
     * Delete a contact.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $contact = $request->user()->contacts()->findOrFail($id);
        $contact->groups()->detach();
        $contact->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Contact deleted successfully.',
        ]);
    }

    /**
     * Import contacts from a CSV payload.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'contacts' => 'required|array|min:1|max:5000',
            'contacts.*.name' => 'required|string|max:255',
            'contacts.*.phone' => 'required|string|max:20',
            'contacts.*.email' => 'nullable|email|max:255',
            'contacts.*.tags' => 'nullable|array',
        ]);

        $user = $request->user();
        $imported = 0;
        $skipped = 0;
        $errors = [];

        foreach ($request->input('contacts') as $index => $row) {
            $exists = $user->contacts()->where('phone', $row['phone'])->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            try {
                $user->contacts()->create([
                    'name' => $row['name'],
                    'phone' => $row['phone'],
                    'email' => $row['email'] ?? null,
                    'tags' => $row['tags'] ?? null,
                ]);
                $imported++;
            } catch (\Exception $e) {
                $skipped++;
                $errors[] = "Row {$index}: {$e->getMessage()}";
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'imported' => $imported,
                'skipped' => $skipped,
                'errors' => $errors,
            ],
            'message' => "{$imported} contacts imported, {$skipped} skipped.",
        ]);
    }
}
