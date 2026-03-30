<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use Illuminate\Http\Request;

class PlanManagementController extends Controller
{
    public function index()
    {
        $plans = SubscriptionPlan::orderBy('sort_order')->get();
        return view('admin.plans.index', compact('plans'));
    }

    public function create()
    {
        return view('admin.plans.create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:subscription_plans',
            'description' => 'nullable|string',
            'price_monthly' => 'required|numeric|min:0',
            'price_yearly' => 'required|numeric|min:0',
            'max_sessions' => 'required|integer|min:1',
            'max_messages_per_day' => 'required|integer|min:1',
            'max_contacts' => 'required|integer|min:1',
            'max_campaigns_per_month' => 'nullable|integer|min:0',
            'max_chatbot_flows' => 'required|integer|min:0',
            'max_team_members' => 'required|integer|min:1',
            'has_api_access' => 'boolean',
            'has_webhooks' => 'boolean',
            'has_group_messaging' => 'boolean',
            'is_active' => 'boolean',
        ]);

        SubscriptionPlan::create($validated);

        return redirect()->route('admin.plans.index')->with('success', 'Plan created.');
    }

    public function edit(SubscriptionPlan $plan)
    {
        return view('admin.plans.edit', compact('plan'));
    }

    public function update(Request $request, SubscriptionPlan $plan)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:subscription_plans,slug,' . $plan->id,
            'description' => 'nullable|string',
            'price_monthly' => 'required|numeric|min:0',
            'price_yearly' => 'required|numeric|min:0',
            'max_sessions' => 'required|integer|min:1',
            'max_messages_per_day' => 'required|integer|min:1',
            'max_contacts' => 'required|integer|min:1',
            'max_campaigns_per_month' => 'nullable|integer|min:0',
            'max_chatbot_flows' => 'required|integer|min:0',
            'max_team_members' => 'required|integer|min:1',
            'has_api_access' => 'boolean',
            'has_webhooks' => 'boolean',
            'has_group_messaging' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $plan->update($validated);

        return redirect()->route('admin.plans.index')->with('success', 'Plan updated.');
    }

    public function destroy(SubscriptionPlan $plan)
    {
        $plan->delete();
        return redirect()->route('admin.plans.index')->with('success', 'Plan deleted.');
    }
}
