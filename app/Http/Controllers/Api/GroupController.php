<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroupController extends Controller
{
    /**
     * List all contact groups with member count.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $perPage = (int) $request->input('per_page', 50);

        $groups = $request->user()
            ->contactGroups()
            ->withCount('contacts')
            ->orderBy('name')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $groups,
            'message' => 'Groups retrieved successfully.',
        ]);
    }

    /**
     * Create a new contact group.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'contact_ids' => 'nullable|array',
            'contact_ids.*' => 'integer|exists:contacts,id',
        ]);

        $group = $request->user()->contactGroups()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        // Attach initial members if provided
        if (!empty($validated['contact_ids'])) {
            // Verify contacts belong to this user
            $validContactIds = $request->user()
                ->contacts()
                ->whereIn('id', $validated['contact_ids'])
                ->pluck('id');

            $group->contacts()->attach($validContactIds);
            $group->updateContactCount();
        }

        return response()->json([
            'success' => true,
            'data' => $group->loadCount('contacts'),
            'message' => 'Group created successfully.',
        ], 201);
    }

    /**
     * Show a single group with its members.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $group = $request->user()
            ->contactGroups()
            ->withCount('contacts')
            ->findOrFail($id);

        $group->load(['contacts' => function ($query) {
            $query->select('contacts.id', 'contacts.name', 'contacts.phone', 'contacts.email', 'contacts.tags')
                  ->orderBy('contacts.name');
        }]);

        return response()->json([
            'success' => true,
            'data' => $group,
            'message' => 'Group retrieved successfully.',
        ]);
    }

    /**
     * Update a group.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $group = $request->user()->contactGroups()->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $group->update($validated);

        return response()->json([
            'success' => true,
            'data' => $group->fresh()->loadCount('contacts'),
            'message' => 'Group updated successfully.',
        ]);
    }

    /**
     * Delete a group.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $group = $request->user()->contactGroups()->findOrFail($id);
        $group->contacts()->detach();
        $group->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Group deleted successfully.',
        ]);
    }

    /**
     * Add members to a group.
     */
    public function addMembers(Request $request, $id): JsonResponse
    {
        $group = $request->user()->contactGroups()->findOrFail($id);

        $validated = $request->validate([
            'contact_ids' => 'required|array|min:1',
            'contact_ids.*' => 'integer|exists:contacts,id',
        ]);

        // Verify contacts belong to this user
        $validContactIds = $request->user()
            ->contacts()
            ->whereIn('id', $validated['contact_ids'])
            ->pluck('id');

        if ($validContactIds->isEmpty()) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'No valid contacts found to add.',
            ], 422);
        }

        // Sync without detaching (adds only new members)
        $group->contacts()->syncWithoutDetaching($validContactIds);
        $group->updateContactCount();

        return response()->json([
            'success' => true,
            'data' => $group->fresh()->loadCount('contacts'),
            'message' => $validContactIds->count() . ' member(s) added successfully.',
        ]);
    }

    /**
     * Remove a member from a group.
     */
    public function removeMember(Request $request, $id, $contactId): JsonResponse
    {
        $group = $request->user()->contactGroups()->findOrFail($id);

        // Verify the contact belongs to the user
        $contact = $request->user()->contacts()->findOrFail($contactId);

        $group->contacts()->detach($contact->id);
        $group->updateContactCount();

        return response()->json([
            'success' => true,
            'data' => $group->fresh()->loadCount('contacts'),
            'message' => 'Member removed successfully.',
        ]);
    }
}
