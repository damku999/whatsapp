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
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('session_id')->constrained('wa_sessions')->onDelete('cascade');
            $table->string('to_number', 20);
            $table->string('from_number', 20)->nullable();
            $table->enum('direction', ['outgoing', 'incoming'])->default('outgoing');
            $table->enum('message_type', [
                'text', 'image', 'video', 'audio', 'document',
                'location', 'contact', 'sticker', 'buttons', 'list', 'poll',
            ])->default('text');
            $table->text('content')->nullable();
            $table->text('media_path')->nullable();
            $table->text('media_url')->nullable();
            $table->string('wa_message_id')->nullable()->index();
            $table->enum('status', ['queued', 'sent', 'delivered', 'read', 'failed'])->default('queued');
            $table->text('error_msg')->nullable();
            $table->string('quoted_message_id')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->foreignId('campaign_id')->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'to_number']);
            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
