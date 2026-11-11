import React, { useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useSession } from '@/features/auth';
import { ApiError } from '@/shared/api';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import {
  Alert,
  Badge,
  Button,
  Card,
  ErrorState,
  FormField,
  SegmentedFilter,
  Spinner,
  Text,
  TextInput,
  confirmDestructiveAction,
} from '@/shared/ui';
import { financeApi, type ExpenseCategory, type FinancePeriod } from '../api/finance.api';
import {
  categories,
  civilDate,
  displayDate,
  money,
  monthLabel,
  parseMoney,
  shiftMonth,
} from '../model/finance.helpers';

export function FinanceScreen() {
  const { identity, memberships, selectedShopId, barbershop } = useSession();
  const { colors } = useTheme();
  const allowed =
    identity &&
    selectedShopId &&
    memberships.some(
      (item) => item.id === selectedShopId && item.role === 'OWNER' && item.state === 'ACTIVE',
    );
  if (!allowed)
    return (
      <View style={{ flex: 1, padding: 24, backgroundColor: colors.background.primary }}>
        <Text>O financeiro está disponível ao proprietário ativo da unidade.</Text>
      </View>
    );
  return (
    <FinanceContent
      key={identity.id + selectedShopId}
      actorId={identity.id}
      shopId={selectedShopId}
      shopName={barbershop?.name}
    />
  );
}
function FinanceContent({
  actorId,
  shopId,
  shopName,
}: {
  actorId: string;
  shopId: string;
  shopName?: string;
}) {
  const { colors, spacing } = useTheme();
  const { isCompact, contentMaxWidth } = useAdaptiveLayout();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState<string>();
  const [section, setSection] = useState<'overview' | 'expenses' | 'bookings'>('overview');
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');
  const [payee, setPayee] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('VARIABLE');
  const [paymentDate, setPaymentDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const saving = useRef(false);
  const requests = useRef(new Map<string, string>());
  const key = ['finance', actorId, shopId, month ?? 'current'];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => financeApi.period(shopId, month, signal),
    staleTime: 30_000,
    retry: 1,
  });
  const data = query.data;
  function requestId(signature: string) {
    let id = requests.current.get(signature);
    if (!id) {
      id = Crypto.randomUUID();
      requests.current.set(signature, id);
    }
    return id;
  }
  async function save(operation: () => Promise<unknown>, success: string, after?: () => void) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await operation();
      setNotice(success);
      after?.();
      await queryClient.invalidateQueries({ queryKey: ['finance', actorId, shopId] });
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Não foi possível salvar o lançamento.',
      );
      if (failure instanceof ApiError && failure.status === 409) {
        await queryClient.invalidateQueries({ queryKey: ['finance', actorId, shopId] });
      }
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function openExpense() {
    setDue(
      displayDate(
        data
          ? data.today.startsWith(data.month)
            ? data.today
            : data.month + '-01'
          : new Date().toISOString().slice(0, 10),
      ),
    );
    setShowForm(!showForm);
  }
  const paymentIso = civilDate(paymentDate || displayDate(data?.today ?? ''));
  async function confirmed(operation: () => Promise<unknown>, title: string, message: string) {
    if (saving.current) return;
    const accepted = await confirmDestructiveAction({
      title,
      message,
      confirmLabel: 'Confirmar',
      cancelLabel: 'Voltar',
    });
    if (accepted) await save(operation, 'Registro atualizado.');
  }
  function create() {
    const amountInCents = parseMoney(amount);
    const dueOn = civilDate(due);
    if (!amountInCents || !dueOn || description.trim().length < 2) {
      setError('Informe uma descrição, um valor positivo e o vencimento em DD/MM/AAAA.');
      return;
    }
    const values = {
      description: description.trim(),
      category,
      amountInCents,
      dueOn,
      payee: payee.trim(),
    };
    const signature = JSON.stringify(values);
    void save(
      () => financeApi.create(shopId, { ...values, requestId: requestId(signature) }),
      'Despesa cadastrada.',
      () => {
        requests.current.delete(signature);
        setDescription('');
        setAmount('');
        setPayee('');
        setShowForm(false);
        setSection('expenses');
        setMonth(dueOn.slice(0, 7));
      },
    );
  }
  const expenseRows = data?.entries.filter((item) => item.kind === 'EXPENSE') ?? [];
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={query.isFetching && !query.isPending}
          onRefresh={() => void query.refetch()}
        />
      }
      style={{ flex: 1, backgroundColor: colors.background.primary }}
      contentContainerStyle={{
        padding: isCompact ? spacing[4] : spacing[6],
        paddingBottom: 130,
        alignItems: 'center',
      }}
    >
      <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: spacing[4] }}>
        <View style={{ gap: 8 }}>
          <Text variant="h2" weight="bold" accessibilityRole="header">
            Financeiro
          </Text>
          <Text color={colors.text.secondary}>
            {shopName || 'Recebimentos, despesas e previsão da unidade'}
          </Text>
          <Button
            title={showForm ? 'Fechar cadastro' : 'Nova despesa'}
            variant="primary"
            onPress={openExpense}
            disabled={busy || !data}
          />
        </View>
        {data ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Button
              title=""
              accessibilityLabel="Mês anterior"
              variant="outline"
              disabled={busy || data.month <= '0001-01'}
              leftIcon={<Ionicons name="chevron-back" size={20} color={colors.text.primary} />}
              onPress={() => {
                setShowForm(false);
                setMonth(shiftMonth(data.month, -1));
              }}
            />
            <Text
              weight="semibold"
              style={{ flex: 1, textAlign: 'center', textTransform: 'capitalize' }}
            >
              {monthLabel(data.month)}
            </Text>
            <Button
              title=""
              accessibilityLabel="Próximo mês"
              variant="outline"
              disabled={busy || data.month >= '9999-12'}
              leftIcon={<Ionicons name="chevron-forward" size={20} color={colors.text.primary} />}
              onPress={() => {
                setShowForm(false);
                setMonth(shiftMonth(data.month, 1));
              }}
            />
          </View>
        ) : null}
        {error ? <Alert variant="error" title="Registro não concluído" message={error} /> : null}
        {notice ? (
          <Text accessibilityRole="alert" color={colors.feedback.success}>
            {notice}
          </Text>
        ) : null}
        {showForm ? (
          <Card>
            <Text variant="h3" weight="bold" style={{ marginBottom: 16 }}>
              Cadastrar despesa
            </Text>
            <FormField label="Descrição" required>
              <TextInput
                accessibilityLabel="Descrição da despesa"
                value={description}
                maxLength={160}
                editable={!busy}
                onChangeText={setDescription}
                placeholder="Aluguel, produtos, repasse…"
              />
            </FormField>
            <Text variant="bodySm" weight="semibold">
              Categoria
            </Text>
            <View
              accessibilityRole="radiogroup"
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 }}
            >
              {categories.map((item) => (
                <Pressable
                  key={item.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: category === item.value, disabled: busy }}
                  disabled={busy}
                  onPress={() => setCategory(item.value)}
                  style={{
                    minHeight: 44,
                    padding: 12,
                    borderWidth: 1,
                    borderRadius: 16,
                    borderColor:
                      category === item.value ? colors.brand.primary : colors.border.default,
                    backgroundColor: colors.surface.input,
                  }}
                >
                  <Text
                    color={category === item.value ? colors.brand.primary : colors.text.primary}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <FormField label="Valor em reais" required>
              <TextInput
                accessibilityLabel="Valor da despesa em reais"
                value={amount}
                editable={!busy}
                keyboardType="decimal-pad"
                maxLength={16}
                onChangeText={setAmount}
                placeholder="0,00"
              />
            </FormField>
            <FormField label="Vencimento" required helperText="DD/MM/AAAA">
              <TextInput
                accessibilityLabel="Vencimento da despesa"
                value={due}
                editable={!busy}
                maxLength={10}
                onChangeText={setDue}
                placeholder="DD/MM/AAAA"
              />
            </FormField>
            <FormField
              label="Favorecido"
              helperText="Opcional, para identificar fornecedor ou profissional"
            >
              <TextInput
                accessibilityLabel="Favorecido"
                value={payee}
                editable={!busy}
                maxLength={120}
                onChangeText={setPayee}
              />
            </FormField>
            <Button title="Salvar despesa" onPress={create} loading={busy} />
          </Card>
        ) : null}
        {query.isPending ? (
          <View style={{ padding: 32 }}>
            <Spinner />
            <Text>Carregando financeiro…</Text>
          </View>
        ) : query.isError ? (
          <ErrorState
            title="Financeiro indisponível"
            description="Não foi possível obter os dados da unidade."
            onRetry={() => void query.refetch()}
          />
        ) : data ? (
          <>
            <SegmentedFilter
              options={[
                { value: 'overview', label: 'Resumo' },
                { value: 'expenses', label: 'Despesas' },
                { value: 'bookings', label: isCompact ? 'Serviços' : 'Atendimentos' },
              ]}
              value={section}
              onChange={setSection}
              disabled={busy}
            />
            {data.summary.unknownPrices > 0 ? (
              <Alert
                variant="warning"
                message={`${data.summary.unknownPrices} atendimento(s) sem preço completo. Os valores de serviços estão parcialmente apurados.`}
              />
            ) : null}
            {section === 'overview' ? (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {[
                    ['Serviços concluídos', data.summary.completedInCents],
                    ['Agendado', data.summary.forecastInCents],
                    ['Recebido', data.summary.receivedInCents],
                    ['Despesas pagas', data.summary.paidInCents],
                    ['A pagar no mês', data.summary.payableInCents],
                    ['Saldo do período', data.summary.balanceInCents],
                  ].map(([label, value]) => (
                    <Card
                      key={String(label)}
                      style={{
                        flexGrow: 1,
                        flexBasis: isCompact ? '46%' : '30%',
                        minWidth: 0,
                        padding: isCompact ? spacing[3] : spacing[6],
                      }}
                    >
                      <Text variant="caption" color={colors.text.secondary}>
                        {label}
                      </Text>
                      <Text
                        variant={isCompact ? 'subhead' : 'h2'}
                        weight="bold"
                        color={colors.text.primary}
                        style={{ marginTop: 8 }}
                      >
                        {money(Number(value))}
                      </Text>
                    </Card>
                  ))}
                </View>
                <Text variant="caption" color={colors.text.secondary}>
                  Recebido considera os registros deste módulo pela data do pagamento. Serviços
                  concluídos e agendados seguem a data do atendimento.
                </Text>
                <FinanceChart data={data} />
              </>
            ) : null}
            {section !== 'overview' ? (
              <Card>
                <FormField
                  label="Data do pagamento ou recebimento"
                  helperText="DD/MM/AAAA. Confira a data antes de registrar."
                >
                  <TextInput
                    accessibilityLabel="Data do pagamento ou recebimento"
                    value={paymentDate || displayDate(data.today)}
                    maxLength={10}
                    editable={!busy}
                    onChangeText={setPaymentDate}
                  />
                </FormField>
              </Card>
            ) : null}
            {section === 'expenses' ? (
              <>
                {expenseRows.length === 0 ? (
                  <Card>
                    <Text>Nenhuma despesa neste período.</Text>
                  </Card>
                ) : null}
                {expenseRows.map((item) => (
                  <Card key={item.id}>
                    <View style={{ gap: 8 }}>
                      <Text variant="subhead" weight="bold">
                        {item.description}
                      </Text>
                      <Badge
                        label={
                          item.status === 'PAID'
                            ? 'Paga'
                            : item.status === 'CANCELLED'
                              ? 'Cancelada'
                              : item.dueOn < data.today
                                ? 'Em atraso'
                                : 'A pagar'
                        }
                        tone={
                          item.status === 'PAID'
                            ? 'success'
                            : item.status === 'CANCELLED'
                              ? 'neutral'
                              : 'warning'
                        }
                      />
                      <Text variant="h3" weight="bold">
                        {money(item.amountInCents)}
                      </Text>
                      <Text color={colors.text.secondary}>
                        {categories.find((c) => c.value === item.category)?.label} · Vence em{' '}
                        {displayDate(item.dueOn)}
                      </Text>
                      {item.payee ? <Text color={colors.text.secondary}>{item.payee}</Text> : null}
                      {item.paidOn ? <Text>Pago em {displayDate(item.paidOn)}</Text> : null}
                      {item.status === 'PLANNED' ? (
                        <>
                          <Button
                            title="Registrar pagamento"
                            disabled={busy}
                            onPress={() => {
                              if (!paymentIso) {
                                setError('Confira a data do pagamento.');
                                return;
                              }
                              void confirmed(
                                () => financeApi.update(shopId, item, 'PAY', paymentIso),
                                'Registrar pagamento',
                                `Registrar ${money(item.amountInCents)} em ${displayDate(paymentIso)}?`,
                              );
                            }}
                          />
                          <Button
                            title="Cancelar previsão"
                            variant="ghost"
                            disabled={busy}
                            onPress={() =>
                              void confirmed(
                                () => financeApi.update(shopId, item, 'CANCEL'),
                                'Cancelar previsão',
                                'Cancelar esta despesa prevista?',
                              )
                            }
                          />
                        </>
                      ) : null}
                      {item.category === 'FIXED' && item.status !== 'CANCELLED' ? (
                        <Button
                          title="Repetir no mês seguinte"
                          variant="outline"
                          disabled={busy}
                          onPress={() =>
                            void confirmed(
                              () => financeApi.copy(shopId, item.id, requestId('copy:' + item.id)),
                              'Repetir despesa',
                              'Criar uma despesa fixa no mês seguinte, com o mesmo valor?',
                            )
                          }
                        />
                      ) : null}
                    </View>
                  </Card>
                ))}
              </>
            ) : null}
            {section === 'bookings' ? (
              <>
                {data.bookings.length === 0 ? (
                  <Card>
                    <Text>Nenhum atendimento neste período.</Text>
                  </Card>
                ) : null}
                {data.bookings.map((item) => (
                  <Card key={item.id}>
                    <View style={{ gap: 8 }}>
                      <Text weight="bold">{item.services}</Text>
                      <Text color={colors.text.secondary}>
                        {displayDate(item.date)} · {item.professional}
                      </Text>
                      <Text variant="h3">{money(item.amountInCents)}</Text>
                      <Badge
                        label={
                          item.status === 'COMPLETED'
                            ? 'Concluído'
                            : item.status === 'CANCELLED'
                              ? 'Cancelado'
                              : item.status === 'NO_SHOW'
                                ? 'Não compareceu'
                                : 'Agendado'
                        }
                        tone={item.status === 'COMPLETED' ? 'success' : 'neutral'}
                      />
                      {item.receiptId ? (
                        <Text color={colors.feedback.success}>Recebimento registrado</Text>
                      ) : item.status === 'COMPLETED' &&
                        item.amountInCents !== null &&
                        item.amountInCents > 0 ? (
                        <Button
                          title="Registrar recebimento"
                          disabled={busy}
                          onPress={() => {
                            if (!paymentIso) {
                              setError('Confira a data do recebimento.');
                              return;
                            }
                            void confirmed(
                              () =>
                                financeApi.receipt(
                                  shopId,
                                  item.id,
                                  paymentIso,
                                  requestId('receipt:' + item.id + ':' + paymentIso),
                                ),
                              'Registrar recebimento',
                              `Confirmar o recebimento integral de ${money(item.amountInCents)} em ${displayDate(paymentIso)}?`,
                            );
                          }}
                        />
                      ) : null}
                    </View>
                  </Card>
                ))}
              </>
            ) : null}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function FinanceChart({ data }: { data: FinancePeriod }) {
  const { colors } = useTheme();
  const groups = [];
  for (let start = 0; start < data.summary.daily.length; start += 7) {
    const days = data.summary.daily.slice(start, start + 7);
    groups.push({
      label: `${start + 1}–${start + days.length}`,
      completed: days.reduce((sum, day) => sum + day.completedInCents, 0),
      forecast: days.reduce((sum, day) => sum + day.forecastInCents, 0),
      paid: days.reduce((sum, day) => sum + day.paidInCents, 0),
    });
  }
  const largest = Math.max(
    1,
    ...groups.flatMap((group) => [group.completed, group.forecast, group.paid]),
  );
  return (
    <Card>
      <Text variant="h3" weight="bold">
        Movimento por semana
      </Text>
      {groups.map((group) => (
        <View key={group.label} style={{ marginTop: 20, gap: 8 }}>
          <Text weight="semibold">Dias {group.label}</Text>
          {[
            { label: 'Concluídos', amount: group.completed, color: colors.brand.primary },
            { label: 'Agendados', amount: group.forecast, color: colors.text.secondary },
            { label: 'Despesas pagas', amount: group.paid, color: colors.feedback.error },
          ].map((series) => (
            <View key={series.label} style={{ gap: 4 }}>
              <Text variant="caption" color={colors.text.secondary}>
                {series.label} · {money(series.amount)}
              </Text>
              <View style={{ height: 6, backgroundColor: colors.surface.input, borderRadius: 3 }}>
                <View
                  style={{
                    height: 6,
                    width: `${(series.amount / largest) * 100}%`,
                    backgroundColor: series.color,
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      ))}
    </Card>
  );
}
