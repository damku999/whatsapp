@extends('admin.layouts.app')
@section('title', 'Platform Settings')

@section('content')
<form method="POST" action="{{ route('admin.settings.update') }}">
    @csrf
    @foreach($settings as $group => $items)
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div class="px-6 py-4 border-b">
            <h3 class="font-semibold text-gray-800 capitalize">{{ $group }} Settings</h3>
        </div>
        <div class="p-6 space-y-4">
            @foreach($items as $setting)
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ ucwords(str_replace('_', ' ', $setting->key)) }}</label>
                @if($setting->description)<p class="text-xs text-gray-500 mb-1">{{ $setting->description }}</p>@endif
                @if($setting->type === 'boolean')
                <select name="settings[{{ $setting->key }}]" class="border rounded-lg px-3 py-2 text-sm w-full max-w-xs">
                    <option value="1" {{ $setting->value ? 'selected' : '' }}>Yes</option>
                    <option value="0" {{ !$setting->value ? 'selected' : '' }}>No</option>
                </select>
                @else
                <input type="text" name="settings[{{ $setting->key }}]" value="{{ $setting->value }}" class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wa-500 max-w-lg">
                @endif
            </div>
            @endforeach
        </div>
    </div>
    @endforeach
    <button type="submit" class="bg-wa-600 text-white px-6 py-2 rounded-lg hover:bg-wa-700">Save Settings</button>
</form>
@endsection
