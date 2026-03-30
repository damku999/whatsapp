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
        Schema::create('chatbot_flows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('session_id')->nullable()->constrained('wa_sessions')->onDelete('set null');
            $table->string('name');
            $table->string('trigger_keyword')->nullable();
            $table->enum('trigger_type', ['exact', 'contains', 'starts_with', 'regex', 'any'])->default('exact');
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(0);
            $table->boolean('office_hours_only')->default(false);
            $table->time('office_hours_start')->nullable();
            $table->time('office_hours_end')->nullable();
            $table->text('fallback_message')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chatbot_flows');
    }
};
