<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CampaignController extends Controller
{
    public function index(Request $request)
    {
        $campaigns = $request->user()->campaigns()->latest()->paginate(20);
        return response()->json(['success' => true, 'data' => $campaigns]);
    }

    public function store(Request $request)
    {
        return response()->json(['success' => false, 'message' => 'Campaign creation via API coming in Milestone 7'], 501);
    }
}
