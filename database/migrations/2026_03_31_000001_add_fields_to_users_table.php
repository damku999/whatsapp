<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'client'])->default('client')->after('password');
            $table->enum('status', ['active', 'suspended', 'pending'])->default('pending')->after('role');
            $table->foreignId('plan_id')->nullable()->after('status');
            $table->string('api_key', 64)->unique()->nullable()->after('plan_id');
            $table->string('api_secret', 255)->nullable()->after('api_key');
            $table->string('phone', 20)->nullable()->after('api_secret');
            $table->string('company_name', 255)->nullable()->after('phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'role',
                'status',
                'plan_id',
                'api_key',
                'api_secret',
                'phone',
                'company_name',
            ]);
        });
    }
};
