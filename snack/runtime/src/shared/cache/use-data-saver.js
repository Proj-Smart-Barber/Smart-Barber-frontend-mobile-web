import { useEffect, useState } from 'react';
export function useDataSaver() {
    const read = () => {
        var _a;
        if (typeof navigator === 'undefined')
            return false;
        const connection = navigator.connection;
        return (process.env.EXPO_PUBLIC_DATA_SAVER === 'true' ||
            (connection === null || connection === void 0 ? void 0 : connection.saveData) === true ||
            ['slow-2g', '2g', '3g'].includes((_a = connection === null || connection === void 0 ? void 0 : connection.effectiveType) !== null && _a !== void 0 ? _a : ''));
    };
    const [enabled, setEnabled] = useState(read);
    useEffect(() => {
        var _a;
        if (typeof navigator === 'undefined')
            return;
        const connection = navigator.connection;
        const update = () => setEnabled(read());
        (_a = connection === null || connection === void 0 ? void 0 : connection.addEventListener) === null || _a === void 0 ? void 0 : _a.call(connection, 'change', update);
        return () => { var _a; return (_a = connection === null || connection === void 0 ? void 0 : connection.removeEventListener) === null || _a === void 0 ? void 0 : _a.call(connection, 'change', update); };
    }, []);
    return enabled;
}
