<div class="grid grid-cols-2 gap-4">
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
        <input type="text" name="name" value="{{ old('name', $plan->name ?? '') }}" class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wa-500" required>
        @error('name')<p class="text-red-500 text-xs mt-1">{{ $message }}</p>@enderror
    </div>
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Slug</label>
        <input type="text" name="slug" value="{{ old('slug', $plan->slug ?? '') }}" class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wa-500" required>
        @error('slug')<p class="text-red-500 text-xs mt-1">{{ $message }}</p>@enderror
    </div>
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Monthly Price (INR)</label>
        <input type="number" step="0.01" name="price_monthly" value="{{ old('price_monthly', $plan->price_monthly ?? '') }}" class="w-full border rounded-lg px-3 py-2 text-sm" required>
    </div>
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Yearly Price (INR)</label>
        <input type="number" step="0.01" name="price_yearly" value="{{ old('price_yearly', $plan->price_yearly ?? '') }}" class="w-full border rounded-lg px-3 py-2 text-sm" required>
    </div>
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Max Sessions</label>
        <input type="number" name="max_sessions" value="{{ old('max_sessions', $plan->max_sessions ?? 1) }}" class="w-full border rounded-lg px-3 py-2 text-sm" required>
    </div>
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Messages/Day</label>
        <input type="number" name="max_messages_per_day" value="{{ old('max_messages_per_day', $plan->max_messages_per_day ?? 500) }}" class="w-full border rounded-lg px-3 py-2 text-sm" required>
    </div>
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Max Contacts</label>
        <input type="number" name="max_contacts" value="{{ old('max_contacts', $plan->max_contacts ?? 1000) }}" class="w-full border rounded-lg px-3 py-2 text-sm" required>
    </div>
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Campaigns/Month</label>
        <input type="number" name="max_campaigns_per_month" value="{{ old('max_campaigns_per_month', $plan->max_campaigns_per_month ?? '') }}" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Leave empty for unlimited">
    </div>
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Chatbot Flows</label>
        <input type="number" name="max_chatbot_flows" value="{{ old('max_chatbot_flows', $plan->max_chatbot_flows ?? 1) }}" class="w-full border rounded-lg px-3 py-2 text-sm" required>
    </div>
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Team Members</label>
        <input type="number" name="max_team_members" value="{{ old('max_team_members', $plan->max_team_members ?? 1) }}" class="w-full border rounded-lg px-3 py-2 text-sm" required>
    </div>
    <div class="col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea name="description" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm">{{ old('description', $plan->description ?? '') }}</textarea>
    </div>
    <div class="col-span-2 flex gap-6">
        <label class="flex items-center gap-2"><input type="checkbox" name="has_api_access" value="1" {{ old('has_api_access', $plan->has_api_access ?? false) ? 'checked' : '' }} class="rounded text-wa-600"> API Access</label>
        <label class="flex items-center gap-2"><input type="checkbox" name="has_webhooks" value="1" {{ old('has_webhooks', $plan->has_webhooks ?? false) ? 'checked' : '' }} class="rounded text-wa-600"> Webhooks</label>
        <label class="flex items-center gap-2"><input type="checkbox" name="has_group_messaging" value="1" {{ old('has_group_messaging', $plan->has_group_messaging ?? false) ? 'checked' : '' }} class="rounded text-wa-600"> Group Messaging</label>
        <label class="flex items-center gap-2"><input type="checkbox" name="is_active" value="1" {{ old('is_active', $plan->is_active ?? true) ? 'checked' : '' }} class="rounded text-wa-600"> Active</label>
    </div>
</div>
