<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Membuat error validasi selalu berformat JSON dengan status HTTP 422,
 * walaupun client tidak mengirim header "Accept: application/json".
 */
trait ReturnsJsonErrors
{
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Validasi gagal',
            'errors'  => $validator->errors(),
        ], 422));
    }
}
