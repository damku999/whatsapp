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
        Schema::create('wa_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('session_name');
            $table->string('phone_number', 20)->nullable();
            $table->enum('status', ['pending', 'scanning', 'active', 'disconnected', 'banned'])->default('pending');
            $table->text('qr_code')->nullable();
            $table->string('pairing_code', 10)->nullable();
            $table->string('engine_session_id')->nullable()->unique();
            $table->string('profile_name')->nullable();
            $table->text('profile_picture_url')->nullable();
            $table->timestamp('last_active_at')->nullable();
            $table->integer('reconnect_attempts')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wa_sessions');
    }
};
