<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'user_id', 'code', 'recipient_name', 'phone', 'address',
        'payment_method', 'subtotal', 'shipping', 'total', 'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Ongkir: gratis jika belanja >= Rp 1.000.000, selain itu Rp 20.000.
     */
    public static function shippingFee(float $subtotal): float
    {
        return ($subtotal <= 0 || $subtotal >= 1000000) ? 0.0 : 20000.0;
    }

    /**
     * Bentuk array siap kirim sebagai JSON (pastikan relasi items sudah di-load).
     */
    public function toPayload(): array
    {
        return [
            'id'             => $this->id,
            'code'           => $this->code,
            'status'         => $this->status,
            'recipient_name' => $this->recipient_name,
            'phone'          => $this->phone,
            'address'        => $this->address,
            'payment_method' => $this->payment_method,
            'subtotal'       => (float) $this->subtotal,
            'shipping'       => (float) $this->shipping,
            'total'          => (float) $this->total,
            'created_at'     => $this->created_at,
            'customer'       => ($this->relationLoaded('user') && $this->user)
                ? ['name' => $this->user->name, 'email' => $this->user->email]
                : null,
            'items'          => $this->items->map(fn ($i) => [
                'name'  => $i->name,
                'size'  => $i->size,
                'qty'   => $i->qty,
                'price' => (float) $i->price,
            ])->values()->all(),
        ];
    }
}
