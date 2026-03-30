@extends('admin.layouts.app')
@section('title', 'Edit Plan: ' . $plan->name)

@section('content')
<div class="max-w-2xl">
    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <form method="POST" action="{{ route('admin.plans.update', $plan) }}">
            @csrf @method('PUT')
            @include('admin.plans._form', ['plan' => $plan])
            <div class="mt-6 flex gap-3">
                <button type="submit" class="bg-wa-600 text-white px-6 py-2 rounded-lg hover:bg-wa-700">Update Plan</button>
                <a href="{{ route('admin.plans.index') }}" class="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50">Cancel</a>
            </div>
        </form>
    </div>
</div>
@endsection
