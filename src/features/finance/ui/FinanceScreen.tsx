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
  shiftDate,
  dateRange,
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
  const [periodMode, setPeriodMode] = useState<'month' | 'week' | 'day' | 'custom'>('month');
  const [anchor, setAnchor] = useState('');
  const [custom, setCustom] = useState<{ from: string; to: string }>();
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const metadata = useRef<FinancePeriod | undefined>(undefined);
  const range =
    periodMode === 'week' || periodMode === 'day'
      ? dateRange(anchor, periodMode)
      : periodMode === 'custom'
        ? custom
        : undefined;
  const [section, setSection] = useState<'overview' | 'expenses' | 'bookings'>('overview');
  const [showForm, setShowForm] = useState(false);
  const [showValueInfo, setShowValueInfo] = useState(false);
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
  const [pageState, setPageState] = useState({ scope: '', page: 1 });
  const pageScope = JSON.stringify([month ?? 'current', range?.from, range?.to, section]);
  const page = pageState.scope === pageScope ? pageState.page : 1;
  const view = section === 'overview' ? 'summary' : section === 'expenses' ? 'entries' : 'bookings';
  const key = ['finance', actorId, shopId, month ?? 'current', range?.from, range?.to, view, page];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => financeApi.period(shopId, range ? undefined : month, signal, range, { view, page }),
    staleTime: 30_000,
    retry: 1,
  });
  const data = query.data;
  if (data) metadata.current = data;
  const controls = data ?? metadata.current;
  function selectPeriod(mode: typeof periodMode) {
    if (!controls) return;
    setShowForm(false);
    setError('');
    const reference =
      periodMode === 'month'
        ? controls.month === controls.today.slice(0, 7)
          ? controls.today
          : (controls.from ?? controls.month + '-01')
        : periodMode === 'custom'
          ? (custom?.from ?? controls.today)
          : anchor;
    setAnchor(reference);
    if (mode === 'month') setMonth(reference.slice(0, 7));
    if (mode === 'custom') {
      const from = controls.from ?? controls.month + '-01';
      const to = controls.to ?? controls.today;
      setDraftFrom(displayDate(from));
      setDraftTo(displayDate(to));
      setCustom({ from, to });
    }
    setPeriodMode(mode);
  }
  function movePeriod(delta: number) {
    if (!controls) return;
    setShowForm(false);
    if (periodMode === 'month') setMonth(shiftMonth(month ?? controls.month, delta));
    else setAnchor(shiftDate(anchor, delta * (periodMode === 'week' ? 7 : 1)));
  }
  function applyCustom() {
    const from = civilDate(draftFrom),
      to = civilDate(draftTo);
    if (!from || !to || from > to) {
      setError('Informe datas válidas, com início anterior ou igual ao fim.');
      return;
    }
    setError('');
    setCustom({ from, to });
  }
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
        setPeriodMode('month');
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
        {controls ? (
          <View style={{ gap: 12 }}>
            <SegmentedFilter
              options={[
                { value: 'month', label: 'Mês' },
                { value: 'week', label: 'Semana' },
                { value: 'day', label: 'Dia' },
                { value: 'custom', label: 'Período' },
              ]}
              value={periodMode}
              onChange={selectPeriod}
              disabled={busy || query.isFetching}
            />
            {periodMode === 'custom' ? (
              <Card>
                <FormField label="Início" helperText="DD/MM/AAAA">
                  <TextInput
                    accessibilityLabel="Início do período"
                    value={draftFrom}
                    maxLength={10}
                    editable={!busy}
                    onChangeText={setDraftFrom}
                  />
                </FormField>
                <FormField label="Fim" helperText="DD/MM/AAAA">
                  <TextInput
                    accessibilityLabel="Fim do período"
                    value={draftTo}
                    maxLength={10}
                    editable={!busy}
                    onChangeText={setDraftTo}
                  />
                </FormField>
                <Button
                  title="Aplicar período"
                  variant="outline"
                  onPress={applyCustom}
                  disabled={busy || query.isFetching}
                />
              </Card>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Button
                  title=""
                  accessibilityLabel={periodMode === 'month' ? 'Mês anterior' : 'Período anterior'}
                  variant="outline"
                  disabled={busy || query.isFetching || (month ?? controls.month) <= '0001-01'}
                  leftIcon={<Ionicons name="chevron-back" size={20} color={colors.text.primary} />}
                  onPress={() => movePeriod(-1)}
                />
                <Text weight="semibold" style={{ flex: 1, textAlign: 'center' }}>
                  {periodMode === 'month'
                    ? monthLabel(month ?? controls.month)
                    : range
                      ? range.from === range.to
                        ? displayDate(range.from)
                        : `${displayDate(range.from)} – ${displayDate(range.to)}`
                      : ''}
                </Text>
                <Button
                  title=""
                  accessibilityLabel={periodMode === 'month' ? 'Próximo mês' : 'Próximo período'}
                  variant="outline"
                  disabled={busy || query.isFetching || (month ?? controls.month) >= '9999-12'}
                  leftIcon={
                    <Ionicons name="chevron-forward" size={20} color={colors.text.primary} />
                  }
                  onPress={() => movePeriod(1)}
                />
              </View>
            )}
            {periodMode === 'custom' && range ? (
              <Text variant="caption" color={colors.text.secondary}>
                Consultando {displayDate(range.from)} – {displayDate(range.to)}
              </Text>
            ) : null}
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
        ) : query.isError && !data ? (
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
                    ['A pagar no período', data.summary.payableInCents],
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showValueInfo }}
                  onPress={() => setShowValueInfo(!showValueInfo)}
                  style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={colors.text.secondary}
                  />
                  <Text variant="caption" color={colors.text.secondary}>
                    Sobre os valores
                  </Text>
                </Pressable>
                {showValueInfo ? (
                  <Text variant="caption" color={colors.text.secondary}>
                    Recebimentos e despesas pagas seguem a data do pagamento. Serviços seguem a data
                    do atendimento.
                  </Text>
                ) : null}
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
            {section !== 'overview' ? (
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Button title="Anterior" variant="secondary" disabled={page <= 1 || query.isFetching}
                  onPress={() => setPageState({ scope: pageScope, page: page - 1 })} />
                <Text>Página {page}</Text>
                <Button title="Próxima" variant="secondary" disabled={query.isFetching ||
                  (section === 'expenses' ? page * (data.entriesLimit ?? Math.max(1,data.entries.length)) >= (data.entriesTotal ?? data.entries.length)
                    : page * (data.bookingsLimit ?? Math.max(1,data.bookings.length)) >= (data.bookingsTotal ?? data.bookings.length))}
                  onPress={() => setPageState({ scope: pageScope, page: page + 1 })} />
              </View>
            ) : null}
            {query.isError ? <Alert variant="error" message="Não foi possível atualizar. Exibindo os últimos dados recebidos." /> : null}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function FinanceChart({ data }: { data: FinancePeriod }) {
  const { colors } = useTheme();
  const series = [
    { label: 'Concluídos', amount: data.summary.completedInCents, color: colors.brand.primary },
    { label: 'Agendados', amount: data.summary.forecastInCents, color: colors.text.secondary },
    { label: 'Recebido', amount: data.summary.receivedInCents, color: colors.feedback.success },
    { label: 'Despesas pagas', amount: data.summary.paidInCents, color: colors.feedback.error },
  ];
  const largest = Math.max(...series.map((item) => item.amount));
  return (
    <Card>
      <Text variant="h3" weight="bold">
        Totais do período
      </Text>
      {largest === 0 ? (
        <Text color={colors.text.secondary} style={{ marginTop: 12 }}>
          Nenhuma movimentação neste período.
        </Text>
      ) : (
        series.map((item) => (
          <View key={item.label} style={{ marginTop: 20, gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <Text color={colors.text.secondary}>{item.label}</Text>
              <Text weight="semibold">{money(item.amount)}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surface.input }}>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  width: `${(item.amount / largest) * 100}%`,
                  backgroundColor: item.color,
                }}
              />
            </View>
          </View>
        ))
      )}
    </Card>
  );
}
