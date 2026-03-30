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
        Schema::create('message_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('session_id')->constrained('wa_sessions')->onDelete('cascade');
            $table->string('name');
            $table->enum('type', ['text', 'image', 'video', 'document', 'audio'])->default('text');
            $table->text('message_body');
            $table->text('media_path')->nullable();
            $table->integer('delay_min')->default(3);
            $table->integer('delay_max')->default(8);
            $table->timestamp('scheduled_at')->nullable();
            $table->enum('status', [
                'draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled',
            ])->default('draft');
            $table->integer('total_count')->default(0);
            $table->integer('sent_count')->default(0);
            $table->integer('failed_count')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->string('recurrence_pattern')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('message_campaigns');
    }
};
