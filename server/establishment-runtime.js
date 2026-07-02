const DAY_NAMES = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']

const safeJsonParse = (value, fallback) => {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const sanitizeText = (value, maxLength = 255) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength)

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeWeekdayName = (value) => sanitizeText(value, 40)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()

const normalizeHours = (hours) => {
  const input = Array.isArray(hours) ? hours : []
  const byLabel = new Map(input.map((entry) => [normalizeWeekdayName(entry?.label), entry]))

  return DAY_NAMES.map((day) => {
    const current = byLabel.get(normalizeWeekdayName(day)) || {}
    return {
      label: day,
      value: sanitizeText(current.value, 120),
    }
  })
}

const parseRanges = (value) => {
  const normalized = sanitizeText(value, 120)
  if (!normalized || /fechado/i.test(normalized)) return []

  return normalized
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const match = segment.match(/^(\d{2}:\d{2})\s*[—-]\s*(\d{2}:\d{2})$/)
      if (!match) return null
      return {
        start: match[1],
        end: match[2],
        label: `${match[1]} - ${match[2]}`,
      }
    })
    .filter(Boolean)
}

const parseTime = (value) => {
  const [hours, minutes] = String(value || '00:00').split(':').map((item) => parseInt(item, 10))
  return ((hours || 0) * 60) + (minutes || 0)
}

const formatTime = (value) => sanitizeText(value, 10).replace('-', ':')

const buildClosedMessage = (hours, currentDayIndex) => {
  for (let offset = 1; offset <= 7; offset += 1) {
    const targetIndex = (currentDayIndex + offset) % 7
    const entry = hours[targetIndex]
    const ranges = parseRanges(entry?.value)
    if (!ranges.length) continue
    const nextStart = formatTime(ranges[0].start)
    return offset === 1
      ? `Fechado agora • Abrimos amanha as ${nextStart}`
      : `Fechado agora • Abrimos em ${offset} dias as ${nextStart}`
  }
  return 'Fechado agora'
}

export const parseEstablishmentSettings = (row) => {
  const hours = normalizeHours(safeJsonParse(row?.hours_json, []))
  const paymentMethods = safeJsonParse(row?.payment_methods_json, [])
  const deliveryRules = safeJsonParse(row?.delivery_rules_json, [])
  const baseAddress = safeJsonParse(row?.base_address_json, null)
  const theme = safeJsonParse(row?.theme_json, null)

  return {
    id: row?.id || '',
    name: row?.name || '',
    city: row?.city || '',
    uf: row?.uf || '',
    status: row?.status || 'active',
    billing_status: row?.billing_status || 'paid',
    support_contact: row?.support_contact || null,
    instagram: row?.instagram || null,
    avatar_url: row?.avatar_url || null,
    cover_url: row?.cover_url || null,
    hours,
    payment_methods: Array.isArray(paymentMethods) ? paymentMethods : [],
    delivery_rules: Array.isArray(deliveryRules) ? deliveryRules : [],
    base_address: baseAddress && typeof baseAddress === 'object' ? baseAddress : null,
    theme: theme && typeof theme === 'object' ? theme : null,
    created_at: row?.created_at || null,
    updated_at: row?.updated_at || null,
  }
}

export const serializeEstablishmentPayload = (payload = {}) => {
  const hours = normalizeHours(payload.hours)
  const paymentMethods = Array.isArray(payload.payment_methods)
    ? payload.payment_methods.map((item) => sanitizeText(item, 80)).filter(Boolean)
    : []
  const deliveryRules = Array.isArray(payload.delivery_rules)
    ? payload.delivery_rules.map((rule, index) => ({
        id: sanitizeText(rule?.id || `rule_${index + 1}`, 120),
        label: sanitizeText(rule?.label || rule?.neighborhood || rule?.zipcode_prefix || `Regra ${index + 1}`, 120),
        neighborhood: sanitizeText(rule?.neighborhood, 120),
        zipcode_prefix: sanitizeText(rule?.zipcode_prefix, 20).replace(/\D/g, '').slice(0, 8),
        city: sanitizeText(rule?.city, 120),
        uf: sanitizeText(rule?.uf, 8),
        fee: Number(toNumber(rule?.fee, 0).toFixed(2)),
        eta_min_minutes: Math.max(0, parseInt(rule?.eta_min_minutes || 0, 10) || 0),
        eta_max_minutes: Math.max(0, parseInt(rule?.eta_max_minutes || 0, 10) || 0),
        active: rule?.active !== false,
      }))
      .filter((rule) => rule.active && (rule.neighborhood || rule.zipcode_prefix || rule.city))
    : []

  const baseAddress = payload.base_address && typeof payload.base_address === 'object'
    ? {
        street: sanitizeText(payload.base_address.street, 160),
        number: sanitizeText(payload.base_address.number, 30),
        neighborhood: sanitizeText(payload.base_address.neighborhood, 120),
        city: sanitizeText(payload.base_address.city, 120),
        uf: sanitizeText(payload.base_address.uf, 8),
      }
    : null

  const theme = payload.theme && typeof payload.theme === 'object'
    ? payload.theme
    : null

  return {
    instagram: sanitizeText(payload.instagram, 160) || null,
    hours_json: JSON.stringify(hours),
    payment_methods_json: JSON.stringify(paymentMethods),
    delivery_rules_json: JSON.stringify(deliveryRules),
    base_address_json: baseAddress ? JSON.stringify(baseAddress) : null,
    theme_json: theme ? JSON.stringify(theme) : null,
  }
}

export const computeEstablishmentStatus = (settings, now = new Date()) => {
  if (!settings) {
    return {
      is_open: false,
      accepts_orders: false,
      open_status: 'closed',
      label: 'Estabelecimento nao encontrado',
      reason: 'not_found',
      current_day: null,
      current_ranges: [],
    }
  }

  if (settings.status !== 'active' || settings.billing_status !== 'paid') {
    return {
      is_open: false,
      accepts_orders: false,
      open_status: 'closed',
      label: 'Loja indisponivel no momento',
      reason: 'inactive',
      current_day: DAY_NAMES[now.getDay()],
      current_ranges: [],
    }
  }

  const currentDayIndex = now.getDay()
  const currentDay = DAY_NAMES[currentDayIndex]
  const todayEntry = settings.hours[currentDayIndex] || { label: currentDay, value: '' }
  const ranges = parseRanges(todayEntry.value)
  const currentMinutes = (now.getHours() * 60) + now.getMinutes()

  const activeRange = ranges.find((range) => {
    const start = parseTime(range.start)
    const end = parseTime(range.end)
    return currentMinutes >= start && currentMinutes <= end
  })

  if (activeRange) {
    return {
      is_open: true,
      accepts_orders: true,
      open_status: 'open',
      label: `Aberto agora • Hoje: ${activeRange.label}`,
      reason: null,
      current_day: currentDay,
      current_ranges: ranges,
      active_range: activeRange,
    }
  }

  if (ranges.length > 0) {
    const nextStart = formatTime(ranges[0].start)
    return {
      is_open: false,
      accepts_orders: false,
      open_status: 'schedule',
      label: `Fora do horario • Hoje: ${ranges.map((range) => range.label).join(', ')}`,
      reason: 'outside_schedule',
      next_open_label: `Hoje a partir de ${nextStart}`,
      current_day: currentDay,
      current_ranges: ranges,
    }
  }

  return {
    is_open: false,
    accepts_orders: false,
    open_status: 'closed',
    label: buildClosedMessage(settings.hours, currentDayIndex),
    reason: 'closed_today',
    current_day: currentDay,
    current_ranges: [],
  }
}

const normalizeZipcode = (value) => String(value || '').replace(/\D/g, '').slice(0, 8)
const normalizeLocationText = (value) => sanitizeText(value, 120)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()

export const resolveDeliveryQuote = ({ settings, address }) => {
  const rules = Array.isArray(settings?.delivery_rules) ? settings.delivery_rules : []
  const zipcode = normalizeZipcode(address?.zipcode || address?.cep)
  const neighborhood = normalizeLocationText(address?.neighborhood)
  const city = normalizeLocationText(address?.city || settings?.city)
  const uf = normalizeLocationText(address?.uf || settings?.uf)

  const matchedRule = rules.find((rule) => {
    if (rule.active === false) return false
    if (rule.zipcode_prefix) {
      const prefix = normalizeZipcode(rule.zipcode_prefix)
      if (prefix && zipcode.startsWith(prefix)) return true
    }

    const sameNeighborhood = rule.neighborhood
      ? normalizeLocationText(rule.neighborhood) === neighborhood
      : false
    const sameCity = rule.city
      ? normalizeLocationText(rule.city) === city
      : true
    const sameUf = rule.uf
      ? normalizeLocationText(rule.uf) === uf
      : true

    return sameNeighborhood && sameCity && sameUf
  })

  if (!matchedRule) {
    const error = new Error('Area de entrega nao atendida.')
    error.httpStatus = 409
    error.publicBody = {
      error: 'delivery_unavailable',
      message: 'No momento nao entregamos no endereco informado.',
    }
    throw error
  }

  return {
    rule_id: matchedRule.id,
    label: matchedRule.label,
    fee: Number(toNumber(matchedRule.fee, 0).toFixed(2)),
    eta_min_minutes: Math.max(0, parseInt(matchedRule.eta_min_minutes || 0, 10) || 0),
    eta_max_minutes: Math.max(0, parseInt(matchedRule.eta_max_minutes || 0, 10) || 0),
    neighborhood: matchedRule.neighborhood || null,
    zipcode_prefix: matchedRule.zipcode_prefix || null,
  }
}
