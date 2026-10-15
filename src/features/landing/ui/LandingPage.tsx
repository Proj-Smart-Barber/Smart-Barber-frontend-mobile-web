import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/shared/theme';
import { useSession } from '@/features/auth';
import { BrandMark } from '@/shared/brand';
import { landingContent } from '../content/landing-content';
import { landingConfig } from '../lib/config';
import { trackLandingEvent } from '../lib/analytics';
import { validateDemoForm, DemoFormData, DemoFormErrors, ProfessionalsRange } from '../model/demo-form';
import { buildWhatsAppUrl, buildWhatsAppMessage, copyMessageToClipboard } from '../lib/whatsapp';

export function LandingPage(): React.ReactElement {
  const { colors, isDark } = useTheme();
  const { status } = useSession();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView | null>(null);

  const [formData, setFormData] = useState<DemoFormData>({
    nome: '',
    barbearia: '',
    cidadeUf: '',
    profissionais: '2-5',
    necessidade: '',
    configuracao: '',
  });

  const [formErrors, setFormErrors] = useState<DemoFormErrors>({});
  const [hasStartedForm, setHasStartedForm] = useState(false);
  const [preparedUrl, setPreparedUrl] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [activeFaqId, setActiveFaqId] = useState<string | null>(null);
  const [expandedBentoId, setExpandedBentoId] = useState<string | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  const handleSelectPlan = useCallback((planName: string) => {
    setFormData((prev) => ({ ...prev, configuracao: planName }));
    trackLandingEvent({
      name: 'landing_cta_click',
      properties: { audience: 'barber', position: 'pricing', target: planName },
    });
    // Rola para a seção do formulário
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleInputChange = (field: keyof DemoFormData, value: string) => {
    if (!hasStartedForm) {
      setHasStartedForm(true);
      trackLandingEvent({ name: 'demo_form_start', properties: { origin: 'direct' } });
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmitForm = async () => {
    const validation = validateDemoForm(formData);
    if (!validation.success || !validation.data) {
      setFormErrors(validation.errors ?? {});
      return;
    }

    setFormErrors({});

    trackLandingEvent({
      name: 'demo_form_valid',
      properties: {
        professionalsRange: validation.data.profissionais,
        hasConfiguration: Boolean(validation.data.configuracao),
        hasNeed: Boolean(validation.data.necessidade && validation.data.necessidade.length > 0),
      },
    });

    const url = buildWhatsAppUrl(landingConfig.whatsAppNumber, validation.data);
    setPreparedUrl(url);

    trackLandingEvent({
      name: 'whatsapp_handoff_click',
      properties: {
        professionalsRange: validation.data.profissionais,
        hasConfiguration: Boolean(validation.data.configuracao),
        hasNeed: Boolean(validation.data.necessidade && validation.data.necessidade.length > 0),
      },
    });

    try {
      await Linking.openURL(url);
    } catch {
      // Em falha no handler nativo, a URL permanece visível no estado
    }
  };

  const handleCopyMessage = async () => {
    const message = buildWhatsAppMessage(formData);
    const success = await copyMessageToClipboard(message);
    if (success) {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 3000);
    }
  };

  const handleReopen = async () => {
    if (preparedUrl) {
      await Linking.openURL(preparedUrl);
    }
  };

  const isAuthenticated = status === 'authenticated';
  const authLabel = isAuthenticated ? landingContent.header.authenticatedAction : landingContent.header.loginAction;

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: isDark ? '#0B0B0B' : '#F7F5F3' }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* 1. Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#E7E0DD' }]}>
        <View style={styles.headerBrand}>
          <BrandMark variant="symbol-crimson" size={32} decorative />
          <Text style={[styles.headerBrandText, { color: isDark ? '#FFFFFF' : '#171313' }]}>
            {landingContent.header.brandName}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.authButton, { borderColor: isDark ? 'rgba(255,255,255,0.14)' : '#D5CECA' }]}
          onPress={() => router.push(isAuthenticated ? '/(app)' : '/(auth)/login')}
        >
          <Text style={[styles.authButtonText, { color: isDark ? '#FFFFFF' : '#171313' }]}>
            {authLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Hero Section */}
      <View style={styles.section}>
        <Text style={styles.heroEyebrow}>{landingContent.hero.eyebrow}</Text>
        <Text style={[styles.heroHeadline, { color: isDark ? '#FFFFFF' : '#171313' }]}>
          {landingContent.hero.headline}
        </Text>
        <Text style={[styles.heroSupport, { color: isDark ? '#D4D4D4' : '#57534E' }]}>
          {landingContent.hero.support}
        </Text>

        <View style={styles.heroCardsContainer}>
          <View style={[styles.card, { backgroundColor: isDark ? '#131313' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D5CECA' }]}>
            <Text style={styles.cardTag}>{landingContent.hero.clientCta.tag}</Text>
            <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>
              {landingContent.hero.clientCta.title}
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                trackLandingEvent({
                  name: 'landing_cta_click',
                  properties: { audience: 'client', position: 'hero', target: landingContent.hero.clientCta.action },
                });
              }}
            >
              <Text style={styles.primaryButtonText}>{landingContent.hero.clientCta.action}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { backgroundColor: isDark ? '#131313' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D5CECA' }]}>
            <Text style={styles.cardTag}>{landingContent.hero.barberCta.tag}</Text>
            <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>
              {landingContent.hero.barberCta.title}
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                trackLandingEvent({
                  name: 'landing_cta_click',
                  properties: { audience: 'barber', position: 'hero', target: landingContent.hero.barberCta.action },
                });
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }}
            >
              <Text style={styles.primaryButtonText}>{landingContent.hero.barberCta.action}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mockup Conectado */}
        <View style={[styles.card, { backgroundColor: isDark ? '#1F1F1F' : '#EFECE8', marginTop: 24, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E7E0DD' }]}>
          <Text style={styles.mockupNotice}>{landingContent.hero.mockupNotice}</Text>
          <Text style={[styles.mockupTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>
            Catálogo mobile conectado à agenda da equipe
          </Text>
          <View style={styles.mockupDetailBox}>
            <Text style={[styles.tabularNumText, { color: '#BD2026' }]}>Corte & Barba • R$ 85,00 • 45 min</Text>
            <Text style={[styles.mockupSubtext, { color: isDark ? '#A3A3A3' : '#78716C' }]}>
              Horário selecionado: 16:30 com Marcos Silva
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Prova Social / Autoridade */}
      <View style={[styles.section, styles.borderSection, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E7E0DD' }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>
          {landingContent.trust.headline}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: isDark ? '#D4D4D4' : '#57534E' }]}>
          {landingContent.trust.subtitle}
        </Text>

        <View style={styles.cardsStack}>
          {landingContent.trust.items.map((item) => (
            <View
              key={item.id}
              style={[styles.card, { backgroundColor: isDark ? '#131313' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D5CECA' }]}
            >
              <Text style={styles.badge}>{item.badge}</Text>
              <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>{item.title}</Text>
              <Text style={[styles.tabularHighlight, { color: isDark ? '#FFFFFF' : '#171313' }]}>
                {item.highlight}
              </Text>
              <Text style={[styles.tabularNumText, { color: '#BD2026', marginBottom: 8 }]}>{item.meta}</Text>
              <Text style={{ fontSize: 13, color: isDark ? '#8E8E93' : '#78716C' }}>{item.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 4. Problema vs Nova Era */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>
          {landingContent.problem.headline}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: isDark ? '#D4D4D4' : '#57534E' }]}>
          {landingContent.problem.subtitle}
        </Text>

        <View style={styles.cardsStack}>
          <View style={[styles.card, { backgroundColor: isDark ? '#131313' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D5CECA' }]}>
            <Text style={[styles.columnHeading, { color: '#FF5C62' }]}>{landingContent.problem.beforeTitle}</Text>
            {landingContent.problem.beforePoints.map((pt, i) => (
              <View key={i} style={[styles.quoteBox, { backgroundColor: isDark ? '#1F1F1F' : '#EFECE8' }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#8E8E93' : '#78716C', marginBottom: 2 }}>
                  {pt.author}:
                </Text>
                <Text style={{ fontSize: 14, fontStyle: 'italic', color: isDark ? '#D4D4D4' : '#57534E' }}>
                  &ldquo;{pt.quote}&rdquo;
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: isDark ? '#131313' : '#FFFFFF', borderColor: '#BD2026', borderWidth: 2 }]}>
            <Text style={[styles.columnHeading, { color: '#BD2026' }]}>{landingContent.problem.afterTitle}</Text>
            <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#171313', marginBottom: 16 }]}>
              {landingContent.problem.afterResolution}
            </Text>
            {landingContent.problem.afterSteps.map((step, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: '#BD2026', fontWeight: '800', marginRight: 10 }}>✔</Text>
                <Text style={{ fontSize: 14, color: isDark ? '#FFFFFF' : '#171313', flex: 1 }}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 5. Bento Grid */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>
          {landingContent.bento.headline}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: isDark ? '#D4D4D4' : '#57534E' }]}>
          {landingContent.bento.subtitle}
        </Text>

        <View style={styles.cardsStack}>
          {landingContent.bento.items.map((item) => (
            <View
              key={item.id}
              style={[styles.card, { backgroundColor: isDark ? '#131313' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D5CECA' }]}
            >
              <Text style={styles.badge}>{item.badge}</Text>
              <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>{item.title}</Text>
              <Text style={{ fontSize: 14, color: isDark ? '#D4D4D4' : '#57534E', marginBottom: 12 }}>
                {item.description}
              </Text>

              <TouchableOpacity
                style={[styles.outlineButton, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#D5CECA' }]}
                onPress={() => setExpandedBentoId(expandedBentoId === item.id ? null : item.id)}
              >
                <Text style={[styles.outlineButtonText, { color: isDark ? '#FFFFFF' : '#171313' }]}>
                  {expandedBentoId === item.id ? 'Fechar exemplo' : 'Ver exemplo'}
                </Text>
              </TouchableOpacity>

              {expandedBentoId === item.id && (
                <View style={[styles.exampleBox, { backgroundColor: isDark ? '#1F1F1F' : '#EFECE8' }]}>
                  <Text style={[styles.exampleTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>
                    {item.exampleTitle}
                  </Text>
                  <Text style={{ fontSize: 13, color: isDark ? '#D4D4D4' : '#57534E' }}>{item.exampleDetail}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* 6. Como funciona */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>
          {landingContent.howItWorks.headline}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: isDark ? '#D4D4D4' : '#57534E' }]}>
          {landingContent.howItWorks.subtitle}
        </Text>

        <View style={styles.cardsStack}>
          {/* Trilha Cliente */}
          <View style={[styles.card, { backgroundColor: isDark ? '#131313' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D5CECA' }]}>
            <Text style={styles.badge}>{landingContent.howItWorks.clientTrack.badge}</Text>
            <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#171313', marginBottom: 16 }]}>
              {landingContent.howItWorks.clientTrack.title}
            </Text>
            {landingContent.howItWorks.clientTrack.steps.map((st) => (
              <View key={st.number} style={styles.stepRow}>
                <Text style={styles.stepNum}>{st.number}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>{st.title}</Text>
                  <Text style={{ fontSize: 13, color: isDark ? '#D4D4D4' : '#57534E' }}>{st.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Trilha Barbearia */}
          <View style={[styles.card, { backgroundColor: isDark ? '#131313' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D5CECA' }]}>
            <Text style={styles.badge}>{landingContent.howItWorks.barberTrack.badge}</Text>
            <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#171313', marginBottom: 16 }]}>
              {landingContent.howItWorks.barberTrack.title}
            </Text>
            {landingContent.howItWorks.barberTrack.steps.map((st) => (
              <View key={st.number} style={styles.stepRow}>
                <Text style={styles.stepNum}>{st.number}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>{st.title}</Text>
                  <Text style={{ fontSize: 13, color: isDark ? '#D4D4D4' : '#57534E' }}>{st.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 7. Planos e Preços */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>
          {landingContent.pricing.headline}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: isDark ? '#D4D4D4' : '#57534E' }]}>
          {landingContent.pricing.subtitle}
        </Text>

        <View style={styles.cardsStack}>
          {landingContent.pricing.plans.map((plan) => (
            <View
              key={plan.id}
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#131313' : '#FFFFFF',
                  borderColor: plan.isFeatured ? '#BD2026' : isDark ? 'rgba(255,255,255,0.12)' : '#D5CECA',
                  borderWidth: plan.isFeatured ? 2 : 1,
                },
              ]}
            >
              {plan.badge && <Text style={styles.badge}>{plan.badge}</Text>}
              <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>{plan.name}</Text>
              <Text style={{ fontSize: 13, color: isDark ? '#D4D4D4' : '#57534E', marginBottom: 12 }}>
                {plan.target}
              </Text>
              <Text style={[styles.tabularHighlight, { color: isDark ? '#FFFFFF' : '#171313', fontSize: 24, marginVertical: 8 }]}>
                {plan.price}
              </Text>

              <View style={{ marginVertical: 12 }}>
                {plan.features.map((feat, fi) => (
                  <Text key={fi} style={{ fontSize: 13, color: isDark ? '#D4D4D4' : '#57534E', marginBottom: 6 }}>
                    ✓ {feat}
                  </Text>
                ))}
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={() => handleSelectPlan(plan.name)}>
                <Text style={styles.primaryButtonText}>{plan.ctaLabel}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* 8. FAQ */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#171313' }]}>
          {landingContent.faq.headline}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: isDark ? '#D4D4D4' : '#57534E' }]}>
          {landingContent.faq.subtitle}
        </Text>

        <View style={styles.cardsStack}>
          {landingContent.faq.items.map((item) => {
            const isOpen = activeFaqId === item.id;
            return (
              <View
                key={item.id}
                style={[styles.card, { backgroundColor: isDark ? '#131313' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D5CECA' }]}
              >
                <TouchableOpacity
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  onPress={() => setActiveFaqId(isOpen ? null : item.id)}
                >
                  <Text style={[styles.cardTitle, { fontSize: 15, color: isDark ? '#FFFFFF' : '#171313', flex: 1 }]}>
                    [{item.category}] {item.question}
                  </Text>
                  <Text style={{ color: '#BD2026', fontSize: 16, fontWeight: '700', marginLeft: 8 }}>
                    {isOpen ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {isOpen && (
                  <Text style={{ fontSize: 14, color: isDark ? '#D4D4D4' : '#57534E', marginTop: 12, lineHeight: 20 }}>
                    {item.answer}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* 9. Formulário Comercial */}
      <View style={styles.section}>
        <View style={[styles.card, { backgroundColor: isDark ? '#131313' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.14)' : '#D5CECA' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#171313', fontSize: 22, textAlign: 'left' }]}>
            {landingContent.footer.formTitle}
          </Text>
          <Text style={{ fontSize: 14, color: isDark ? '#D4D4D4' : '#57534E', marginBottom: 16 }}>
            {landingContent.footer.formSubtitle}
          </Text>

          {formData.configuracao ? (
            <View style={styles.selectedPlanTag}>
              <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '600' }}>
                Configuração: {formData.configuracao}
              </Text>
              <TouchableOpacity onPress={() => setFormData((p) => ({ ...p, configuracao: '' }))}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', marginLeft: 8 }}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Campo Nome */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: isDark ? '#FFFFFF' : '#171313' }]}>Nome completo *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#FFFFFF' : '#171313', borderColor: formErrors.nome ? '#FF5C62' : isDark ? 'rgba(255,255,255,0.18)' : '#C8BFBA' }]}
              value={formData.nome}
              onChangeText={(t) => handleInputChange('nome', t)}
              placeholder="Ex: João da Silva"
              placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
            />
            {formErrors.nome && <Text style={styles.errorText}>{formErrors.nome}</Text>}
          </View>

          {/* Campo Barbearia */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: isDark ? '#FFFFFF' : '#171313' }]}>Nome da Barbearia *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#FFFFFF' : '#171313', borderColor: formErrors.barbearia ? '#FF5C62' : isDark ? 'rgba(255,255,255,0.18)' : '#C8BFBA' }]}
              value={formData.barbearia}
              onChangeText={(t) => handleInputChange('barbearia', t)}
              placeholder="Ex: Barbearia Estilo Clássico"
              placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
            />
            {formErrors.barbearia && <Text style={styles.errorText}>{formErrors.barbearia}</Text>}
          </View>

          {/* Campo Cidade/UF */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: isDark ? '#FFFFFF' : '#171313' }]}>Cidade e Estado *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#FFFFFF' : '#171313', borderColor: formErrors.cidadeUf ? '#FF5C62' : isDark ? 'rgba(255,255,255,0.18)' : '#C8BFBA' }]}
              value={formData.cidadeUf}
              onChangeText={(t) => handleInputChange('cidadeUf', t)}
              placeholder="Ex: São Paulo / SP"
              placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
            />
            {formErrors.cidadeUf && <Text style={styles.errorText}>{formErrors.cidadeUf}</Text>}
          </View>

          {/* Profissionais */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: isDark ? '#FFFFFF' : '#171313' }]}>Profissionais atendendo *</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['1', '2-5', '6-10', '11+'] as ProfessionalsRange[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.rangeButton,
                    {
                      backgroundColor: formData.profissionais === r ? '#BD2026' : isDark ? '#1F1F1F' : '#EFECE8',
                      borderColor: formData.profissionais === r ? '#BD2026' : isDark ? 'rgba(255,255,255,0.14)' : '#D5CECA',
                    },
                  ]}
                  onPress={() => handleInputChange('profissionais', r)}
                >
                  <Text style={[styles.tabularNumText, { color: formData.profissionais === r ? '#FFFFFF' : isDark ? '#FFFFFF' : '#171313', fontWeight: '700' }]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Necessidade */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: isDark ? '#FFFFFF' : '#171313' }]}>Necessidade (opcional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#FFFFFF' : '#171313', borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#C8BFBA' }]}
              multiline
              maxLength={240}
              value={formData.necessidade}
              onChangeText={(t) => handleInputChange('necessidade', t)}
              placeholder="Descreva o que procura no Smart Barber..."
              placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmitForm}>
            <Text style={styles.primaryButtonText}>Continuar no WhatsApp</Text>
          </TouchableOpacity>

          {preparedUrl && (
            <View style={[styles.quoteBox, { marginTop: 16, backgroundColor: isDark ? '#1F1F1F' : '#EFECE8' }]}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#FFFFFF' : '#171313', marginBottom: 8 }}>
                Mensagem pronta para envio.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.outlineButton, { flex: 1 }]} onPress={handleReopen}>
                  <Text style={[styles.outlineButtonText, { color: isDark ? '#FFFFFF' : '#171313' }]}>Abrir conversa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.outlineButton, { flex: 1 }]} onPress={handleCopyMessage}>
                  <Text style={[styles.outlineButtonText, { color: isDark ? '#FFFFFF' : '#171313' }]}>
                    {copiedSuccess ? '✓ Copiado!' : 'Copiar texto'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* 10. Footer Institucional */}
      <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E7E0DD' }]}>
        <BrandMark variant="symbol-crimson" size={24} decorative />
        <Text style={[styles.footerText, { color: isDark ? '#8E8E93' : '#78716C' }]}>
          {landingContent.footer.copyright}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 48,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBrandText: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
  },
  authButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  borderSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BD2026',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroHeadline: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 12,
  },
  heroSupport: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  heroCardsContainer: {
    gap: 16,
  },
  card: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  cardTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BD2026',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 48,
    backgroundColor: '#BD2026',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  mockupNotice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BD2026',
    textTransform: 'uppercase',
  },
  mockupTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  mockupDetailBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  mockupSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  tabularNumText: {
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  tabularHighlight: {
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 26,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  cardsStack: {
    gap: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: '#BD2026',
    backgroundColor: 'rgba(189,32,38,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  columnHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  quoteBox: {
    padding: 12,
    borderRadius: 8,
  },
  outlineButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  exampleBox: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#BD2026',
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  stepNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#BD2026',
    fontVariant: ['tabular-nums'],
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  selectedPlanTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#BD2026',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  rangeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF5C62',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 32,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 13,
  },
});
