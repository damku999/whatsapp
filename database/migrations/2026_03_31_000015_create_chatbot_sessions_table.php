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
        Schema::create('chatbot_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('contact_phone', 20);
            $table->foreignId('flow_id')->constrained('chatbot_flows')->onDelete('cascade');
            $table->foreignId('current_node_id')->nullable()->constrained('chatbot_nodes')->onDelete('set null');
            $table->json('variables_json')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_escalated')->default(false);
            $table->timestamp('started_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chatbot_sessions');
    }
};
