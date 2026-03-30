<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\ChatbotFlow;
use App\Models\ChatbotNode;
use App\Models\WaSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ChatbotController extends Controller
{
    /**
     * List all chatbot flows.
     */
    public function index(Request $request)
    {
        $flows = ChatbotFlow::query()
            ->with('session:id,session_name,phone_number')
            ->withCount('nodes')
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->input('search') . '%');
            })
            ->when($request->filled('session_id'), function ($q) use ($request) {
                $q->where('session_id', $request->input('session_id'));
            })
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $sessions = WaSession::where('status', 'active')
            ->select('id', 'session_name', 'phone_number')
            ->get();

        return Inertia::render('Chatbot/Index', [
            'flows' => $flows,
            'sessions' => $sessions,
            'filters' => $request->only(['search', 'session_id']),
        ]);
    }

    /**
     * Create a new chatbot flow.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('chatbot_flows', 'name')->where('user_id', Auth::id()),
            ],
            'trigger_keyword' => 'required|string|max:255',
            'trigger_type' => 'required|in:exact,contains,starts_with,regex,any',
            'session_id' => 'required|integer|exists:wa_sessions,id',
            'is_active' => 'boolean',
            'priority' => 'nullable|integer|min:0|max:100',
            'office_hours_only' => 'boolean',
            'office_hours_start' => 'nullable|required_if:office_hours_only,true|date_format:H:i',
            'office_hours_end' => 'nullable|required_if:office_hours_only,true|date_format:H:i',
            'fallback_message' => 'nullable|string|max:2000',
        ]);

        // Verify session belongs to user (handled by global scope on find)
        WaSession::findOrFail($validated['session_id']);

        $flow = ChatbotFlow::create($validated);

        return redirect()->route('chatbot.show', $flow)
            ->with('success', 'Chatbot flow created successfully.');
    }

    /**
     * Show a flow with its nodes.
     */
    public function show(ChatbotFlow $flow)
    {
        $flow->load([
            'session:id,session_name,phone_number',
            'nodes' => function ($q) {
                $q->orderBy('sort_order');
            },
        ]);

        $flow->loadCount('activeSessions');

        return Inertia::render('Chatbot/Show', [
            'flow' => $flow,
        ]);
    }

    /**
     * Update flow settings.
     */
    public function update(Request $request, ChatbotFlow $flow)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('chatbot_flows', 'name')
                    ->where('user_id', Auth::id())
                    ->ignore($flow->id),
            ],
            'trigger_keyword' => 'required|string|max:255',
            'trigger_type' => 'required|in:exact,contains,starts_with,regex,any',
            'session_id' => 'required|integer|exists:wa_sessions,id',
            'is_active' => 'boolean',
            'priority' => 'nullable|integer|min:0|max:100',
            'office_hours_only' => 'boolean',
            'office_hours_start' => 'nullable|required_if:office_hours_only,true|date_format:H:i',
            'office_hours_end' => 'nullable|required_if:office_hours_only,true|date_format:H:i',
            'fallback_message' => 'nullable|string|max:2000',
        ]);

        WaSession::findOrFail($validated['session_id']);

        $flow->update($validated);

        return redirect()->back()->with('success', 'Chatbot flow updated successfully.');
    }

    /**
     * Delete a flow and all its nodes/sessions.
     */
    public function destroy(ChatbotFlow $flow)
    {
        // End any active chatbot sessions
        $flow->activeSessions()->update(['is_active' => false]);

        // Delete all nodes
        $flow->nodes()->delete();

        $flow->delete();

        return redirect()->route('chatbot.index')
            ->with('success', 'Chatbot flow deleted successfully.');
    }

    /**
     * Toggle active status of a flow.
     */
    public function toggle(ChatbotFlow $flow)
    {
        $flow->update(['is_active' => !$flow->is_active]);

        $status = $flow->is_active ? 'activated' : 'deactivated';

        return redirect()->back()->with('success', "Chatbot flow {$status}.");
    }

    /**
     * Add a node to a flow.
     */
    public function addNode(Request $request, ChatbotFlow $flow)
    {
        $validated = $request->validate([
            'node_type' => 'required|in:text,image,button,list,delay,condition,input,action',
            'content' => 'nullable|string|max:4096',
            'media_path' => 'nullable|string|max:500',
            'options_json' => 'nullable|array',
            'next_node_id' => 'nullable|integer|exists:chatbot_nodes,id',
            'variable_name' => 'nullable|string|max:100',
            'position_x' => 'nullable|numeric',
            'position_y' => 'nullable|numeric',
        ]);

        // Validate that next_node_id belongs to the same flow
        if (!empty($validated['next_node_id'])) {
            $nextNode = ChatbotNode::where('id', $validated['next_node_id'])
                ->where('flow_id', $flow->id)
                ->first();

            if (!$nextNode) {
                return redirect()->back()->withErrors(['next_node_id' => 'Next node must belong to the same flow.']);
            }
        }

        // Determine sort order (append to end)
        $maxOrder = $flow->nodes()->max('sort_order') ?? 0;
        $validated['sort_order'] = $maxOrder + 1;
        $validated['flow_id'] = $flow->id;

        ChatbotNode::create($validated);

        return redirect()->back()->with('success', 'Node added to flow.');
    }

    /**
     * Update a node.
     */
    public function updateNode(Request $request, ChatbotFlow $flow, ChatbotNode $node)
    {
        // Ensure node belongs to the flow
        if ($node->flow_id !== $flow->id) {
            abort(404);
        }

        $validated = $request->validate([
            'node_type' => 'required|in:text,image,button,list,delay,condition,input,action',
            'content' => 'nullable|string|max:4096',
            'media_path' => 'nullable|string|max:500',
            'options_json' => 'nullable|array',
            'next_node_id' => 'nullable|integer|exists:chatbot_nodes,id',
            'variable_name' => 'nullable|string|max:100',
            'position_x' => 'nullable|numeric',
            'position_y' => 'nullable|numeric',
        ]);

        if (!empty($validated['next_node_id'])) {
            // Prevent self-referencing
            if ($validated['next_node_id'] === $node->id) {
                return redirect()->back()->withErrors(['next_node_id' => 'A node cannot point to itself.']);
            }

            $nextNode = ChatbotNode::where('id', $validated['next_node_id'])
                ->where('flow_id', $flow->id)
                ->first();

            if (!$nextNode) {
                return redirect()->back()->withErrors(['next_node_id' => 'Next node must belong to the same flow.']);
            }
        }

        $node->update($validated);

        return redirect()->back()->with('success', 'Node updated.');
    }

    /**
     * Delete a node from a flow.
     */
    public function deleteNode(ChatbotFlow $flow, ChatbotNode $node)
    {
        if ($node->flow_id !== $flow->id) {
            abort(404);
        }

        // Clear any references to this node from other nodes in the same flow
        ChatbotNode::where('flow_id', $flow->id)
            ->where('next_node_id', $node->id)
            ->update(['next_node_id' => null]);

        // Clear references from active chatbot sessions
        $flow->activeSessions()
            ->where('current_node_id', $node->id)
            ->update(['current_node_id' => null, 'is_active' => false]);

        $node->delete();

        return redirect()->back()->with('success', 'Node deleted.');
    }

    /**
     * Reorder nodes in a flow.
     */
    public function reorderNodes(Request $request, ChatbotFlow $flow)
    {
        $validated = $request->validate([
            'node_ids' => 'required|array|min:1',
            'node_ids.*' => 'integer|exists:chatbot_nodes,id',
        ]);

        // Ensure all nodes belong to this flow
        $flowNodeIds = $flow->nodes()->pluck('id')->toArray();
        $requestedIds = $validated['node_ids'];

        foreach ($requestedIds as $id) {
            if (!in_array($id, $flowNodeIds, true)) {
                return redirect()->back()->withErrors(['node_ids' => 'All nodes must belong to this flow.']);
            }
        }

        foreach ($requestedIds as $index => $nodeId) {
            ChatbotNode::where('id', $nodeId)
                ->where('flow_id', $flow->id)
                ->update(['sort_order' => $index + 1]);
        }

        return redirect()->back()->with('success', 'Nodes reordered.');
    }
}
