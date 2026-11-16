import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../shared/theme';
import { Text, Button, Card, PasswordInput, FormField } from '../../shared/ui';
import { httpClient } from '../../shared/api/http-client';
import { processActivationState } from '../../features/invitations/model/invitation-response-engine';
export default function ActivateBarberScreen() {
    const router = useRouter();
    const { colors, spacing } = useTheme();
    const searchParams = useLocalSearchParams();
    const [token, setToken] = useState(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [instructionMessage, setInstructionMessage] = useState(null);
    const [isExistingAccount, setIsExistingAccount] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [isActivated, setIsActivated] = useState(false);
    useEffect(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const hash = window.location.hash;
            const match = hash.match(/token=([^&]+)/);
            if (match && match[1]) {
                setToken(decodeURIComponent(match[1]));
                return;
            }
        }
        if (searchParams.token && typeof searchParams.token === 'string') {
            setToken(searchParams.token);
        }
    }, [searchParams]);
    const validatePassword = (pwd) => {
        const codePointLength = Array.from(pwd).length;
        if (codePointLength < 8) {
            return 'A senha deve ter pelo menos 8 caracteres. Uma frase fácil de lembrar funciona.';
        }
        const byteLength = new TextEncoder().encode(pwd).length;
        if (byteLength > 72) {
            return 'Essa senha é longa demais. Use uma frase mais curta.';
        }
        return null;
    };
    const handleActivate = async () => {
        var _a, _b;
        setErrorMessage(null);
        setInstructionMessage(null);
        if (!token) {
            setErrorMessage('Token de ativação ausente ou inválido. Abra o link enviado por e-mail.');
            return;
        }
        const pwdError = validatePassword(password);
        if (pwdError) {
            setErrorMessage(pwdError);
            return;
        }
        if (password !== confirmPassword) {
            setErrorMessage('As senhas digitadas não coincidem.');
            return;
        }
        setIsSubmitting(true);
        try {
            await httpClient.post('/api/barbers/activate', {
                token,
                password,
            });
            setIsActivated(true);
        }
        catch (err) {
            const code = ((_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.code) || (err === null || err === void 0 ? void 0 : err.code) || '';
            const msg = (err === null || err === void 0 ? void 0 : err.message) || '';
            const state = processActivationState(code, msg);
            if (state.requiresLogin) {
                setIsExistingAccount(true);
                setInstructionMessage(state.instruction);
            }
            else {
                setErrorMessage(msg || 'Falha ao ativar o cadastro profissional.');
            }
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (<ScrollView contentContainerStyle={styles.scroll}>
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <Card style={styles.card}>
          <Text variant="h2" style={{ color: colors.text.primary, fontWeight: '700', textAlign: 'center' }}>
            Ativação de Barbeiro
          </Text>
          <Text variant="body" style={{ color: colors.text.secondary, textAlign: 'center', marginTop: 8 }}>
            Complete a ativação do seu perfil profissional.
          </Text>

          {isActivated ? (<View style={{ marginTop: 20 }}>
              <View style={[styles.alertBox, { backgroundColor: colors.feedback.successBackground }]}>
                <Text variant="body" style={{ color: colors.feedback.success, textAlign: 'center' }}>
                  Cadastro ativado com sucesso! Você já pode entrar e responder aos seus convites.
                </Text>
              </View>
              <Button title="Fazer Login" variant="primary" style={{ marginTop: 16 }} onPress={() => router.push('/(auth)/login')}/>
            </View>) : isExistingAccount ? (<View style={{ marginTop: 20 }}>
              <View style={[styles.alertBox, { backgroundColor: colors.feedback.infoBackground }]}>
                <Text variant="body" style={{ color: colors.feedback.info, textAlign: 'center' }}>
                  {instructionMessage}
                </Text>
              </View>
              <Button title="Ir para o Login" variant="primary" style={{ marginTop: 16 }} onPress={() => router.push('/(auth)/login')}/>
            </View>) : (<View style={{ marginTop: 20 }}>
              {errorMessage && (<View style={[styles.alertBox, { backgroundColor: colors.feedback.errorBackground, marginBottom: 16 }]}>
                  <Text variant="caption" style={{ color: colors.feedback.error }}>
                    {errorMessage}
                  </Text>
                </View>)}

              <FormField label="Crie uma nova senha">
                <PasswordInput value={password} onChangeText={setPassword} placeholder="Mínimo 8 caracteres"/>
              </FormField>

              <FormField label="Confirme a nova senha">
                <PasswordInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repita a senha"/>
              </FormField>

              <Text variant="caption" style={{ color: colors.text.muted, marginBottom: 20 }}>
                Dica: Use pelo menos 8 caracteres. Uma frase com várias palavras funciona perfeitamente.
              </Text>

              <Button title="Ativar Cadastro" variant="primary" loading={isSubmitting} disabled={isSubmitting} onPress={handleActivate}/>
            </View>)}
        </Card>
      </View>
    </ScrollView>);
}
const styles = StyleSheet.create({
    scroll: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 440,
        padding: 24,
    },
    alertBox: {
        padding: 14,
        borderRadius: 8,
    },
});
