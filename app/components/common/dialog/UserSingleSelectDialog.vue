<script setup>
/**
 * UserSingleSelectDialog.vue
 * ユーザー選択ダイアログ（単一選択専用）
 */
import { computed, ref, watch } from 'vue'

// ==================== Props ====================
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  current: { type: Object, default: null },
  /** 選択対象のラベル（例：「担当者」「営業担当」） */
  targetLabel: { type: String, default: 'ユーザ' },
  theme: { type: String, default: 'morning' },
})
const emit = defineEmits(['update:modelValue', 'apply', 'cancel'])
const api = useNuxtApp().$api

// ==================== 状態 ====================
const allUsers = ref([])
const groupList = ref([])
const loading = ref(false)
const searchText = ref('')
const selectedGrp = ref('')
const pickedUser = ref(null)

/** グループドロップダウン表示 */
const grpPanelOpen = ref(false)
/** グループ絞り込みキーワード */
const grpQ = ref('')

// ==================== Watchers ====================
// ダイアログを開いた時：初回のみ全件取得
watch(() => props.modelValue, async (val) => {
  if (val) {
    pickedUser.value = props.current ? { ...props.current } : null
    searchText.value = ''
    selectedGrp.value = ''
    grpPanelOpen.value = false
    grpQ.value = ''
    if (allUsers.value.length === 0) {
      await fetchAll()
    }
  } else {
    hideTooltip()
  }
})

// ==================== データ取得 ====================
// 全件を一括取得
async function fetchAll() {
  loading.value = true
  try {
    const res = await api('/user/userselect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchGroup: 0, searchText: null }),
    })

    // グループ: 複数フィールド名対応
    const rawGroups = res.groups ?? res.searchGroupList ?? res.groupList ?? []
    groupList.value = rawGroups.map(g => ({
      groupId: g.value ?? g.group_id ?? g.groupId,
      groupName: g.label ?? g.group_name ?? g.groupName ?? '',
    })).filter(g => g.groupName)

    // ユーザ一覧: 複数フィールド名対応
    allUsers.value = (res.userList ?? res.users ?? res.user_list ?? []).map(u => ({
      userId: u.userId ?? u.user_id,
      userName: u.userName ?? u.user_name,
      groupName: u.groupName ?? u.group_name ?? '',
    }))
  } catch (e) {
    console.error('UserSingleSelectDialog fetchAll error', e)
  } finally {
    loading.value = false
  }
}

// ==================== 算出プロパティ ====================

/** グループ絞り込み後リスト */
const filteredGroups = computed(() => {
  const kw = grpQ.value.trim().toLowerCase()
  if (!kw) return groupList.value
  return groupList.value.filter(g => g.groupName.toLowerCase().includes(kw))
})

/** 選択中グループ名ラベル */
const selectedGrpLabel = computed(() =>
  selectedGrp.value === '' ? 'すべてのグループ' : selectedGrp.value,
)

/** クライアント側フィルタリング済み候補リスト */
const candidates = computed(() => {
  let list = allUsers.value

  // グループフィルター
  if (selectedGrp.value !== '') {
    list = list.filter(u =>
      u.groupName?.split('/').map(s => s.trim()).includes(selectedGrp.value),
    )
  }

  // キーワードフィルター
  const kw = searchText.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(u =>
      (`${u.userName} ${u.groupName}`).toLowerCase().includes(kw),
    )
  }

  return list
})

// ==================== グループパネル操作 ====================
function onGrpBtnClick() {
  grpPanelOpen.value = !grpPanelOpen.value
  grpQ.value = ''
}

function selectGroup(name) {
  selectedGrp.value = name
  grpPanelOpen.value = false
  grpQ.value = ''
}

// ==================== ユーザ選択 ====================
/** 行クリックで即確定 */
function selectUser(user) {
  hideTooltip()
  emit('apply', { userId: user.userId, userName: user.userName, groupName: user.groupName ?? '' })
  emit('update:modelValue', false)
}

function cancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

// ==================== アバター ====================
const COLORS = ['#f97316', '#06b6d4', '#a855f7', '#22c55e', '#ef4444', '#3b82f6', '#ec4899', '#eab308']
function avatarColor(userId) {
  return COLORS[(userId ?? 0) % COLORS.length]
}
function initial(name) {
  return (name ?? '?').charAt(0)
}

// ==================== Tooltip ====================
const tooltipVisible = ref(false)
const tooltipText = ref('')
const tooltipStyle = ref({})

function showTooltip(e, text) {
  if (!text) return
  const r = e.target.getBoundingClientRect()
  tooltipStyle.value = { top: `${r.bottom + 6}px`, left: `${r.left}px` }
  tooltipText.value = text
  tooltipVisible.value = true
}
function hideTooltip() {
  tooltipVisible.value = false
}
</script>

<template>
  <transition name="susd-fade">
    <div
      v-if="modelValue"
      class="susd-overlay"
      :class="{ 'susd-dark': props.theme !== 'morning' }"
      @click.self="cancel"
    >
      <div class="susd-dlg">
        <!-- ==================== ヘッダー ==================== -->
        <div class="susd-head">
          <div>
            <h3 class="susd-title">
              <v-icon icon="mdi-account-tie" size="18" class="susd-title-icon" />
              {{ props.targetLabel }}を選択
            </h3>
            <p class="susd-sub">
              クリックで即選択・確定します
            </p>
          </div>
          <button class="susd-close" aria-label="閉じる" @click="cancel">
            <v-icon icon="mdi-close" size="16" />
          </button>
        </div>

        <!-- ==================== 検索エリア ==================== -->
        <div class="susd-search-area">
          <!-- グループ選択ボタン + パネル -->
          <div class="susd-grp-wrap">
            <button
              class="susd-grp-btn"
              :class="{ 'susd-grp-btn--open': grpPanelOpen }"
              @click="onGrpBtnClick"
            >
              <v-icon icon="mdi-account-group" size="14" class="susd-grp-btn-ic" />
              <span class="susd-grp-btn-label">{{ selectedGrpLabel }}</span>
              <v-icon
                :icon="grpPanelOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                size="16"
                class="susd-grp-btn-caret"
              />
            </button>

            <!-- グループパネル -->
            <transition name="grp-panel">
              <div v-if="grpPanelOpen" class="susd-grp-panel" @mousedown.stop>
                <!-- パネル内グループ検索 -->
                <div class="susd-grp-search-wrap">
                  <v-icon icon="mdi-magnify" size="14" class="susd-grp-search-ic" />
                  <input
                    v-model="grpQ"
                    class="susd-grp-search-input"
                    placeholder="グループを絞り込む"
                  >
                </div>

                <!-- グループリスト -->
                <div class="susd-grp-list">
                  <!-- すべて -->
                  <button
                    class="susd-grp-item"
                    :class="{ 'susd-grp-item--active': selectedGrp === '' }"
                    @click="selectGroup('')"
                  >
                    <span class="susd-grp-dot" style="background: var(--brand)" />
                    <span class="susd-grp-item-name">すべてのグループ</span>
                    <span class="susd-grp-item-count">{{ allUsers.length }}</span>
                    <v-icon v-if="selectedGrp === ''" icon="mdi-check" size="14" class="susd-grp-check" />
                  </button>

                  <!-- グループ行 -->
                  <button
                    v-for="g in filteredGroups"
                    :key="g.groupId"
                    class="susd-grp-item"
                    :class="{ 'susd-grp-item--active': selectedGrp === g.groupName }"
                    @click="selectGroup(g.groupName)"
                  >
                    <span class="susd-grp-dot" :style="{ background: avatarColor(g.groupId) }" />
                    <span class="susd-grp-item-name">{{ g.groupName }}</span>
                    <span class="susd-grp-item-count">{{ g.memberCount ?? '' }}</span>
                    <v-icon v-if="selectedGrp === g.groupName" icon="mdi-check" size="14" class="susd-grp-check" />
                  </button>

                  <!-- 検索結果なし -->
                  <div v-if="filteredGroups.length === 0" class="susd-grp-empty">
                    該当なし
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- フリーワード検索 -->
          <div class="susd-kw-wrap">
            <v-icon icon="mdi-magnify" size="14" class="susd-kw-icon" />
            <input
              v-model="searchText"
              class="susd-kw-inp"
              placeholder="名前で検索"
            >
            <button v-if="searchText" class="susd-kw-clear" @click="searchText = ''">
              <v-icon icon="mdi-close-circle" size="14" />
            </button>
          </div>
        </div>

        <!-- ==================== ユーザー一覧 ==================== -->
        <div class="susd-body" @click.self="grpPanelOpen && (grpPanelOpen = false)">
          <!-- ローディング -->
          <div v-if="loading" class="susd-loading">
            <div class="susd-spinner" />
            <span>読み込み中...</span>
          </div>

          <!-- データなし -->
          <div v-else-if="candidates.length === 0" class="susd-empty">
            <v-icon icon="mdi-account-off-outline" size="36" style="opacity:.3" />
            <span>該当するユーザがいません</span>
          </div>

          <!-- ユーザ行 -->
          <template v-else>
            <div
              v-for="u in candidates"
              :key="u.userId"
              class="susd-row"
              :class="{ 'susd-row--current': pickedUser?.userId === u.userId }"
              @click="selectUser(u)"
            >
              <!-- アバター -->
              <span class="susd-ava" :style="{ background: avatarColor(u.userId) }">
                {{ initial(u.userName) }}
              </span>
              <!-- ユーザー情報 -->
              <span class="susd-info">
                <span class="susd-name">{{ u.userName }}</span>
                <span
                  v-if="u.groupName"
                  class="susd-grp"
                  @mouseenter="showTooltip($event, u.groupName)"
                  @mouseleave="hideTooltip"
                >
                  <v-icon icon="mdi-account-group" size="11" style="opacity:.6; margin-right:2px; vertical-align:middle" />
                  {{ u.groupName }}
                </span>
              </span>
            </div>
          </template>
        </div>

        <!-- ==================== フッター ==================== -->
        <div class="susd-foot">
          <!-- 件数表示 -->
          <span class="susd-count-label">
            <v-icon icon="mdi-account-search" size="14" style="margin-right:4px; opacity:.6" />
            {{ candidates.length }} 件
          </span>
          <button class="susd-cancel-btn" @click="cancel">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  </transition>

  <!-- Tooltip -->
  <teleport to="body">
    <div v-if="tooltipVisible" class="susd-tooltip" :style="tooltipStyle">
      {{ tooltipText }}
    </div>
  </teleport>
</template>

<style scoped>
/* ==================== CSS変数 ==================== */
.susd-overlay {
  --brand:      #f97316;
  --brand-dark: #ea580c;
  --brand-soft: rgba(249,115,22,0.08);
  --brand-ring: rgba(249,115,22,0.22);
  --surface:    #fffaf6;
  --surface-2:  #fdf6ef;
  --border:     rgba(0,0,0,0.08);
  --border-str: rgba(0,0,0,0.13);
  --ink:        #1c1917;
  --text:       #44403c;
  --text-2:     #78716c;
  --text-muted: #a8a29e;

  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.22); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Sans', 'Noto Sans JP', system-ui, sans-serif;
}

/* ==================== ダークモード ==================== */
.susd-dark {
  --brand-soft: rgba(249,115,22,0.12);
  --brand-ring: rgba(249,115,22,0.25);
  --surface:    rgba(13,20,42,0.98);
  --surface-2:  rgba(8,14,32,0.98);
  --border:     rgba(255,255,255,0.08);
  --border-str: rgba(255,255,255,0.14);
  --ink:        rgba(255,255,255,0.88);
  --text:       rgba(255,255,255,0.75);
  --text-2:     rgba(255,255,255,0.50);
  --text-muted: rgba(255,255,255,0.30);
}

/* ==================== トランジション ==================== */
.susd-fade-enter-active, .susd-fade-leave-active { transition: opacity .16s ease; }
.susd-fade-enter-from,   .susd-fade-leave-to     { opacity: 0; }

/* ==================== ダイアログ ==================== */
.susd-dlg {
  width: 440px; max-width: 96vw; height: 560px;
  border-radius: 18px; overflow: hidden;
  display: flex; flex-direction: column;
  background: var(--surface);
  box-shadow: 0 24px 64px rgba(180,100,0,0.16), 0 4px 16px rgba(0,0,0,0.10);
}
.susd-dark .susd-dlg {
  box-shadow: 0 24px 64px rgba(0,0,0,0.60), 0 4px 16px rgba(0,0,0,0.30);
  border: 1px solid var(--border);
}

/* ==================== ヘッダー ==================== */
.susd-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 18px 20px 14px; flex-shrink: 0;
  border-bottom: 1px solid var(--border);
}
.susd-title {
  font-size: 15px; font-weight: 700; color: var(--ink);
  margin-bottom: 2px;
  display: flex; align-items: center; gap: 7px;
}
.susd-title-icon { color: var(--brand); }
.susd-sub { font-size: 11.5px; color: var(--text-muted); }
.susd-close {
  width: 26px; height: 26px; border-radius: 7px; border: none;
  background: var(--border); color: var(--text-2);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background .13s; flex-shrink: 0; margin-top: 2px;
}
.susd-close:hover { background: var(--border-str); }

/* ==================== 検索エリア ==================== */
.susd-search-area {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  position: relative;
}

/* ==================== グループボタン ==================== */
.susd-grp-wrap { position: relative; flex-shrink: 0; }
.susd-grp-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 30px; padding: 0 10px;
  border: 1px solid var(--brand-ring); border-radius: 8px;
  background: var(--brand-soft); color: var(--ink);
  font-size: 12px; font-weight: 500; font-family: inherit;
  cursor: pointer; outline: none;
  transition: border-color .14s, box-shadow .14s;
  white-space: nowrap; max-width: 160px;
}
.susd-grp-btn:hover,
.susd-grp-btn--open {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-ring);
}
.susd-grp-btn-ic    { color: var(--brand); flex-shrink: 0; }
.susd-grp-btn-label { flex: 1; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
.susd-grp-btn-caret { color: var(--text-muted); flex-shrink: 0; }

/* ==================== グループパネル ==================== */
.susd-grp-panel {
  position: absolute;
  top: calc(100% + 6px); left: 0;
  width: 230px;
  background: var(--surface);
  border: 1.5px solid var(--border-str);
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.07);
  z-index: 100; overflow: hidden;
}
.susd-grp-search-wrap {
  display: flex; align-items: center;
  padding: 9px 10px 7px;
  border-bottom: 1px solid var(--border);
  position: relative;
}
.susd-grp-search-ic {
  position: absolute; left: 20px; color: var(--text-muted); pointer-events: none;
}
.susd-grp-search-input {
  width: 100%; height: 28px; padding: 0 8px 0 24px;
  border: 1px solid var(--border); border-radius: 6px;
  background: var(--surface-2); font-size: 12px; color: var(--ink);
  outline: none; font-family: inherit;
}
.susd-grp-search-input:focus { border-color: var(--brand); }
.susd-grp-search-input::placeholder { color: var(--text-muted); }

.susd-grp-list {
  max-height: 240px; overflow-y: auto;
  padding: 5px 5px;
  scrollbar-width: thin; scrollbar-color: var(--border-str) transparent;
}
.susd-grp-list::-webkit-scrollbar { width: 4px; }
.susd-grp-list::-webkit-scrollbar-thumb { background: var(--border-str); border-radius: 4px; }

.susd-grp-item {
  display: flex; align-items: center; gap: 7px;
  width: 100%; padding: 6px 8px; border: none;
  background: transparent; color: var(--text);
  font-size: 12.5px; font-weight: 500; font-family: inherit;
  cursor: pointer; border-radius: 7px; text-align: left;
  transition: background .10s;
}
.susd-grp-item:hover { background: var(--brand-soft); }
.susd-grp-item--active { color: var(--brand-dark); }
.susd-grp-item--active .susd-grp-item-name { font-weight: 700; }

.susd-grp-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}
.susd-grp-item-name {
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.susd-grp-item-count {
  font-size: 11px; color: var(--text-muted); flex-shrink: 0;
}
.susd-grp-check { color: var(--brand); flex-shrink: 0; }
.susd-grp-empty {
  padding: 12px 8px; text-align: center;
  font-size: 12px; color: var(--text-muted);
}

/* パネルトランジション */
.grp-panel-enter-active, .grp-panel-leave-active { transition: opacity .13s, transform .13s; }
.grp-panel-enter-from,   .grp-panel-leave-to     { opacity: 0; transform: translateY(-5px); }

/* ==================== キーワード検索 ==================== */
.susd-kw-wrap {
  flex: 1; display: flex; align-items: center; gap: 6px;
  height: 30px; padding: 0 10px; border-radius: 8px;
  border: 1px solid var(--border-str); background: var(--surface);
}
.susd-kw-icon { color: var(--text-muted); flex-shrink: 0; }
.susd-kw-inp {
  flex: 1; border: none; background: transparent; outline: none;
  font-size: 12.5px; color: var(--ink); font-family: inherit;
}
.susd-kw-inp::placeholder { color: var(--text-muted); }
.susd-kw-clear {
  border: none; background: none; padding: 0;
  color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center;
  transition: color .12s; flex-shrink: 0;
}
.susd-kw-clear:hover { color: var(--ink); }

/* ==================== ユーザー一覧 ==================== */
.susd-body {
  flex: 1; overflow-y: auto; padding: 6px 0;
  min-height: 0; overflow-x: hidden;
  scrollbar-width: thin; scrollbar-color: var(--border-str) transparent;
}
.susd-body::-webkit-scrollbar { width: 4px; }
.susd-body::-webkit-scrollbar-thumb { background: var(--border-str); border-radius: 4px; }

/* ローディング・空状態 */
.susd-loading, .susd-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 40px 20px; color: var(--text-muted); font-size: 13px;
}
.susd-spinner {
  width: 24px; height: 24px; border-radius: 50%;
  border: 3px solid var(--brand-ring);
  border-top-color: var(--brand);
  animation: susd-spin .7s linear infinite;
}
@keyframes susd-spin { to { transform: rotate(360deg); } }

/* ユーザ行 */
.susd-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 16px; cursor: pointer; transition: background .12s;
}
.susd-row:hover       { background: var(--brand-soft); }
.susd-row--current    { background: rgba(249,115,22,0.10); }
.susd-dark .susd-row--current { background: rgba(249,115,22,0.14); }

/* アバター */
.susd-ava {
  width: 32px; height: 32px; border-radius: 50%; color: #fff;
  font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

/* ユーザー情報 */
.susd-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.susd-name {
  font-size: 13px; font-weight: 600; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.susd-grp {
  font-size: 11px; color: var(--text-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  cursor: default; display: flex; align-items: center;
}

/* ==================== フッター ==================== */
.susd-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px 12px; flex-shrink: 0;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}
.susd-count-label {
  font-size: 12px; color: var(--text-muted);
  display: flex; align-items: center;
}
.susd-cancel-btn {
  height: 32px; padding: 0 18px; border-radius: 8px;
  background: var(--border); border: 1px solid var(--border-str);
  color: var(--text-2); font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: background .13s;
}
.susd-cancel-btn:hover { background: var(--border-str); }
</style>

<style>
/* ==================== グローバル（Teleport）/ Global ==================== */
.susd-tooltip {
  position: fixed; z-index: 9999; max-width: 300px;
  padding: 5px 10px; border-radius: 6px;
  background: rgba(28,25,23,0.92); color: #fff;
  font-size: 11.5px; line-height: 1.5;
  pointer-events: none; white-space: pre-wrap;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  font-family: 'DM Sans', 'Noto Sans JP', system-ui, sans-serif;
}
</style>
