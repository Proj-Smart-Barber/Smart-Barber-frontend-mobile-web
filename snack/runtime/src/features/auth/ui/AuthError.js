import React from 'react';
import { Alert } from '../../../shared/ui';
export function AuthError({ message }) {
    if (!message)
        return null;
    return <Alert variant="error" message={message} title="Atenção"/>;
}
