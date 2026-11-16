import React from 'react';
import { StyleSheet } from 'react-native';
import { BootstrapScreen } from '../shared/ui';
export default function Index() {
    return <BootstrapScreen />;
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
//import { Redirect } from 'expo-router';
//export default function Index() {
//return <Redirect href="/availability" />;
//}
