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
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('phone', 20)->index();
            $table->string('email')->nullable();
            $table->json('tags')->nullable();
            $table->json('custom_fields_json')->nullable();
            $table->boolean('opted_out')->default(false);
            $table->timestamp('opted_out_at')->nullable();
            $table->unique(['user_id', 'phone']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
