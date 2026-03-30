<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TemplateController extends Controller
{
    /**
     * Display a listing of message templates.
     */
    public function index(Request $request): Response
    {
        $templates = $request->user()
            ->messageTemplates()
            ->orderBy('name')
            ->paginate(20);

        return Inertia::render('Templates/Index', [
            'templates' => $templates,
        ]);
    }

    /**
     * Store a newly created template.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'body' => 'required|string|max:4096',
            'message_type' => 'nullable|in:text,image,document,video,audio',
            'media_path' => 'nullable|string|max:500',
            'variables_json' => 'nullable|array',
            'variables_json.*' => 'string|max:100',
        ]);

        $request->user()->messageTemplates()->create([
            'name' => $validated['name'],
            'body' => $validated['body'],
            'message_type' => $validated['message_type'] ?? 'text',
            'media_path' => $validated['media_path'] ?? null,
            'variables_json' => $validated['variables_json'] ?? null,
        ]);

        return redirect()->route('templates.index')
            ->with('success', 'Template created successfully.');
    }

    /**
     * Update the specified template.
     */
    public function update(Request $request, $id): RedirectResponse
    {
        $template = $request->user()->messageTemplates()->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'body' => 'sometimes|required|string|max:4096',
            'message_type' => 'nullable|in:text,image,document,video,audio',
            'media_path' => 'nullable|string|max:500',
            'variables_json' => 'nullable|array',
            'variables_json.*' => 'string|max:100',
        ]);

        $template->update($validated);

        return redirect()->route('templates.index')
            ->with('success', 'Template updated successfully.');
    }

    /**
     * Remove the specified template.
     */
    public function destroy(Request $request, $id): RedirectResponse
    {
        $template = $request->user()->messageTemplates()->findOrFail($id);
        $template->delete();

        return redirect()->route('templates.index')
            ->with('success', 'Template deleted successfully.');
    }

    /**
     * Preview a template with sample data.
     */
    public function preview(Request $request, $id)
    {
        $template = $request->user()->messageTemplates()->findOrFail($id);

        $validated = $request->validate([
            'variables' => 'nullable|array',
            'variables.*' => 'string|max:500',
        ]);

        $variables = $validated['variables'] ?? [];

        // If no variables provided, use placeholder sample values
        if (empty($variables) && !empty($template->variables_json)) {
            foreach ($template->variables_json as $varName) {
                $variables[$varName] = '[' . $varName . ']';
            }
        }

        $renderedBody = $template->render($variables);

        return response()->json([
            'success' => true,
            'data' => [
                'name' => $template->name,
                'rendered_body' => $renderedBody,
                'message_type' => $template->message_type,
                'media_path' => $template->media_path,
            ],
            'message' => 'Template preview generated.',
        ]);
    }
}
