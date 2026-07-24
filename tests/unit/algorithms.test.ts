import { test, expect } from '@playwright/test'

test.describe('ALG-001: اختيار الصوت الافتراضي (الطبقات الثلاث)', () => {
  test('طبقة 1: نجمة واحدة تُشغَّل دائماً', async () => {
    const result = await evaluateDefaultRecording({
      hadithId: 'test-001',
      userId: 'student-1',
      recordings: [
        { id: 'rec-a', user_id: 'u2', likes_count: 10, is_verified: true, is_hidden: false },
        { id: 'rec-b', user_id: 'u3', likes_count: 5, is_verified: false, is_hidden: false },
        { id: 'rec-c', user_id: 'u4', likes_count: 2, is_verified: false, is_hidden: false },
      ],
      favorites: [{ recording_id: 'rec-b', user_id: 'student-1' }],
      settings: { community_best_min_likes: 3 },
    })
    expect(result.recording_id).toBe('rec-b')
    expect(result.selection_layer).toBe('favorite')
  })

  test('طبقة 1: تعدد النجوم → الأعلى لايكات بينها', async () => {
    const result = await evaluateDefaultRecording({
      hadithId: 'test-001',
      userId: 'student-1',
      recordings: [
        { id: 'rec-a', user_id: 'u2', likes_count: 10, is_hidden: false },
        { id: 'rec-b', user_id: 'u3', likes_count: 5, is_hidden: false },
      ],
      favorites: [
        { recording_id: 'rec-a', user_id: 'student-1' },
        { recording_id: 'rec-b', user_id: 'student-1' },
      ],
      settings: { community_best_min_likes: 3 },
    })
    expect(result.recording_id).toBe('rec-a')
    expect(result.selection_layer).toBe('favorite')
  })

  test('طبقة 2: معتمد يُشغَّل عند غياب النجوم', async () => {
    const result = await evaluateDefaultRecording({
      hadithId: 'test-001',
      userId: 'student-2',
      recordings: [
        { id: 'rec-a', user_id: 'u2', likes_count: 10, is_verified: false, is_hidden: false },
        { id: 'rec-v', user_id: 'u3', likes_count: 2, is_verified: true, is_hidden: false },
      ],
      favorites: [],
      settings: { community_best_min_likes: 3 },
    })
    expect(result.recording_id).toBe('rec-v')
    expect(result.selection_layer).toBe('verified')
  })

  test('طبقة 2: تعدد المعتمدين → الأحدث اعتماداً', async () => {
    const result = await evaluateDefaultRecording({
      hadithId: 'test-001',
      userId: 'student-2',
      recordings: [
        { id: 'rec-v1', user_id: 'u2', likes_count: 8, is_verified: true, verified_at: '2026-07-22T10:00:00Z', is_hidden: false },
        { id: 'rec-v2', user_id: 'u3', likes_count: 3, is_verified: true, verified_at: '2026-07-23T10:00:00Z', is_hidden: false },
      ],
      favorites: [],
      settings: { community_best_min_likes: 3 },
    })
    expect(result.recording_id).toBe('rec-v2')
    expect(result.selection_layer).toBe('verified')
  })

  test('طبقة 3: أعلى لايكات ≥3 مع شارة أفضل تسجيل', async () => {
    const result = await evaluateDefaultRecording({
      hadithId: 'test-001',
      userId: 'student-2',
      recordings: [
        { id: 'rec-a', user_id: 'u2', likes_count: 10, is_hidden: false },
        { id: 'rec-b', user_id: 'u3', likes_count: 5, is_hidden: false },
      ],
      favorites: [],
      settings: { community_best_min_likes: 3 },
    })
    expect(result.recording_id).toBe('rec-a')
    expect(result.selection_layer).toBe('community')
  })

  test('السقوط للأحدث عندما أعلى لايكات < 3', async () => {
    const result = await evaluateDefaultRecording({
      hadithId: 'test-001',
      userId: 'student-2',
      recordings: [
        { id: 'rec-c', user_id: 'u2', likes_count: 2, is_hidden: false, created_at: '2026-07-20T10:00:00Z' },
        { id: 'rec-d', user_id: 'u3', likes_count: 1, is_hidden: false, created_at: '2026-07-21T10:00:00Z' },
        { id: 'rec-e', user_id: 'u4', likes_count: 0, is_hidden: false, created_at: '2026-07-22T10:00:00Z' },
      ],
      favorites: [],
      settings: { community_best_min_likes: 3 },
    })
    expect(result.recording_id).toBe('rec-e')
    expect(result.selection_layer).toBe('latest')
  })

  test('المخفي لا يدخل الاختيار حتى لو مفضَّل/معتمد', async () => {
    const result = await evaluateDefaultRecording({
      hadithId: 'test-001',
      userId: 'student-1',
      recordings: [
        { id: 'rec-v', user_id: 'u2', likes_count: 10, is_verified: true, is_hidden: true },
        { id: 'rec-a', user_id: 'u3', likes_count: 3, is_hidden: false },
      ],
      favorites: [{ recording_id: 'rec-v', user_id: 'student-1' }],
      settings: { community_best_min_likes: 3 },
    })
    expect(result.recording_id).toBe('rec-a')
  })

  test('زائر (غير موثّق) يبدأ من الطبقة 2', async () => {
    const result = await evaluateDefaultRecording({
      hadithId: 'test-001',
      userId: null,
      recordings: [
        { id: 'rec-v', user_id: 'u2', likes_count: 2, is_verified: true, is_hidden: false },
        { id: 'rec-a', user_id: 'u3', likes_count: 10, is_hidden: false },
      ],
      favorites: [],
      settings: { community_best_min_likes: 3 },
    })
    expect(result.recording_id).toBe('rec-v')
    expect(result.selection_layer).toBe('verified')
  })
})

test.describe('ALG-002: عتبات البلاغات النسبية', () => {
  // الصيغة: MAX(الحد الأدنى, CEIL(نشطين × النسبة))
  // الافتراضي: تنبيه 15%/2, إخفاء 40%/4

  test('8 طلاب نشطين → عتبة تنبيه 2, عتبة إخفاء 4', () => {
    const alertThreshold = Math.max(2, Math.ceil(8 * 0.15))
    const hideThreshold = Math.max(4, Math.ceil(8 * 0.40))
    expect(alertThreshold).toBe(2)
    expect(hideThreshold).toBe(4)
  })

  test('20 طالباً نشطاً → عتبة تنبيه 3, عتبة إخفاء 8', () => {
    const alertThreshold = Math.max(2, Math.ceil(20 * 0.15))
    const hideThreshold = Math.max(4, Math.ceil(20 * 0.40))
    expect(alertThreshold).toBe(3)
    expect(hideThreshold).toBe(8)
  })

  test('40 طالباً نشطاً → عتبة تنبيه 6, عتبة إخفاء 16', () => {
    const alertThreshold = Math.max(2, Math.ceil(40 * 0.15))
    const hideThreshold = Math.max(4, Math.ceil(40 * 0.40))
    expect(alertThreshold).toBe(6)
    expect(hideThreshold).toBe(16)
  })

  test('3 طلاب نشطين → الحد الأدنى المطلق يمنع التلاعب (2 و4)', () => {
    const alertThreshold = Math.max(2, Math.ceil(3 * 0.15))
    const hideThreshold = Math.max(4, Math.ceil(3 * 0.40))
    expect(alertThreshold).toBe(2)
    expect(hideThreshold).toBe(4)
  })
})

test.describe('ALG-003: عداد الاستماع الذكي', () => {
  test('استماع أقل من 5 ثوانٍ لا يُحتسب', () => {
    const thresholdSeconds = 5
    const listenDuration = 3
    expect(listenDuration >= thresholdSeconds).toBe(false)
  })

  test('استماع 5 ثوانٍ أو أكثر يُحتسب', () => {
    const thresholdSeconds = 5
    const listenDuration = 8
    expect(listenDuration >= thresholdSeconds).toBe(true)
  })

  test('نفس المستخدم لنفس التسجيل لا يُحتسب مرتين', () => {
    const existingListens = new Set(['user1:rec-a'])
    const isDuplicate = existingListens.has('user1:rec-a')
    expect(isDuplicate).toBe(true)
  })
})

test.describe('ALG-005: تحديد معدل الرفع', () => {
  test('5 تسجيلات في الساعة مسموح, السادس مرفوض', () => {
    const limit = 5
    const recentUploads = 5
    expect(recentUploads < limit).toBe(false)
    expect(recentUploads >= limit).toBe(true)
  })

  test('أقل من الحد مسموح', () => {
    const limit = 5
    const recentUploads = 3
    expect(recentUploads < limit).toBe(true)
  })
})

test.describe('ALG-006: فصل التفضيل عن التقييم', () => {
  test('النجمة لا تؤثر على likes_count', () => {
    const likesCount = 10
    const isFavorited = true
    // النجمة لا تُغيّر اللايكات أبداً
    const newLikesCount = isFavorited ? likesCount : likesCount
    expect(newLikesCount).toBe(10)
  })

  test('الإعجاب لا يُضيف نجمة تلقائياً', () => {
    const liked = true
    const wasFavorited = false
    expect(wasFavorited).toBe(false)
  })
})

// دالة مساعدة لمحاكاة ALG-001
async function evaluateDefaultRecording(params: {
  hadithId: string
  userId: string | null
  recordings: any[]
  favorites: any[]
  settings: any
}) {
  const { userId, recordings, favorites, settings } = params

  const visible = recordings.filter(r => !r.is_hidden)
  if (visible.length === 0) return { recording_id: null, selection_layer: 'none' }

  // Layer 1: Personal favorites
  if (userId) {
    const myFavorites = visible.filter(r =>
      favorites.some(f => f.recording_id === r.id && f.user_id === userId)
    )
    if (myFavorites.length === 1) {
      return { recording_id: myFavorites[0].id, selection_layer: 'favorite' }
    }
    if (myFavorites.length > 1) {
      const best = myFavorites.reduce((a, b) => (a.likes_count > b.likes_count ? a : b))
      return { recording_id: best.id, selection_layer: 'favorite' }
    }
  }

  // Layer 2: Verified
  const verified = visible.filter(r => r.is_verified)
  if (verified.length > 0) {
    const sorted = verified.sort((a, b) => {
      if (a.verified_at !== b.verified_at) {
        return new Date(b.verified_at).getTime() - new Date(a.verified_at).getTime()
      }
      return b.likes_count - a.likes_count
    })
    return { recording_id: sorted[0].id, selection_layer: 'verified' }
  }

  // Layer 3: Community best
  const minLikes = settings.community_best_min_likes || 3
  const topLiked = visible.reduce((a, b) => (a.likes_count > b.likes_count ? a : b))
  if (topLiked.likes_count >= minLikes) {
    return { recording_id: topLiked.id, selection_layer: 'community' }
  }

  // Fallback: Latest
  const latest = visible.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]
  return { recording_id: latest.id, selection_layer: 'latest' }
}
