import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
export default function AppNotificationDetailRedirect() {
    const { notificationId } = useLocalSearchParams();
    return <Redirect href={`/(account)/notifications/${notificationId}`}/>;
}
