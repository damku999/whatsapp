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
        Schema::create('chatbot_nodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('flow_id')->constrained('chatbot_flows')->onDelete('cascade');
            $table->enum('node_type', [
                'text', 'image', 'list', 'button', 'delay', 'condition', 'input', 'action',
            ])->default('text');
            $table->text('content')->nullable();
            $table->text('media_path')->nullable();
            $table->json('options_json')->nullable();
            $table->unsignedBigInteger('next_node_id')->nullable();
            $table->integer('position_x')->default(0);
            $table->integer('position_y')->default(0);
            $table->string('variable_name')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chatbot_nodes');
    }
};
