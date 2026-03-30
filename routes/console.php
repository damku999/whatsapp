<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// -------------------------------------------------------------------------
// Scheduled Commands
// -------------------------------------------------------------------------

Schedule::command('subscriptions:check-expiry')->dailyAt('06:00');
Schedule::command('sessions:health-check')->everyFiveMinutes();
