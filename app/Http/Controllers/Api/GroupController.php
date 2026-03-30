<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class GroupController extends Controller
{
    public function index(Request $request)
    {
        $groups = $request->user()->contactGroups()->withCount('contacts')->paginate(50);
        return response()->json(['success' => true, 'data' => $groups]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $group = $request->user()->contactGroups()->create($validated);
        return response()->json(['success' => true, 'data' => $group], 201);
    }
}
