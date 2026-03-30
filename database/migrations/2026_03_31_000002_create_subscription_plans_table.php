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
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->decimal('price_monthly', 10, 2);
            $table->decimal('price_yearly', 10, 2);
            $table->integer('max_sessions')->default(1);
            $table->integer('max_messages_per_day')->default(500);
            $table->integer('max_contacts')->default(1000);
            $table->integer('max_campaigns_per_month')->nullable();
            $table->integer('max_chatbot_flows')->default(1);
            $table->integer('max_team_members')->default(1);
            $table->boolean('has_api_access')->default(false);
            $table->boolean('has_webhooks')->default(false);
            $table->boolean('has_group_messaging')->default(false);
            $table->json('features_json')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
