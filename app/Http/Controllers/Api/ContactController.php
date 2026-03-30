<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function index(Request $request)
    {
        $contacts = $request->user()->contacts()->paginate(50);
        return response()->json(['success' => true, 'data' => $contacts]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email',
            'tags' => 'nullable|array',
        ]);

        $contact = $request->user()->contacts()->create($validated);
        return response()->json(['success' => true, 'data' => $contact], 201);
    }

    public function show(Request $request, $id)
    {
        $contact = $request->user()->contacts()->findOrFail($id);
        return response()->json(['success' => true, 'data' => $contact]);
    }

    public function update(Request $request, $id)
    {
        $contact = $request->user()->contacts()->findOrFail($id);
        $contact->update($request->only(['name', 'phone', 'email', 'tags']));
        return response()->json(['success' => true, 'data' => $contact]);
    }

    public function destroy(Request $request, $id)
    {
        $request->user()->contacts()->findOrFail($id)->delete();
        return response()->json(['success' => true, 'message' => 'Contact deleted']);
    }
}
