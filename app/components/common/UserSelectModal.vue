<!--
  components/UserSelectModal.vue
  ─────────────────────────────────────────────────────────────────
  営業担当を選択モーダル（複数選択 / Option C: 即追加 + 選択済みタブ）
  Modal chọn người dùng (multi-select, kiểu "thêm tức thì + tab đã chọn").

  ・グループはドロップダウン（多数グループ対応・絞り込み内蔵）
    Lọc nhóm bằng dropdown (chịu được nhiều nhóm, có ô tìm trong dropdown).
  ・名前/グループ名で検索 / Tìm theo tên hoặc tên nhóm.
  ・「すべて選択」(候補タブ) と「全削除」(選択済みタブ)。
  ・配色は全て useThemeCssVars() が :root に注入する --t-* を参照。
    Toàn bộ màu đọc từ biến --t-* nên tự đổi theo theme morning/noon/evening.

  使い方 / Cách dùng:
    <UserSelectModal
      v-model="selectedIds"          // 選択中のユーザーID配列 / mảng id đã chọn
      v-model:show="showPicker"      // 表示状態 / hiển thị
      :groups="groups"               // グループ毎にユーザーを内包 / mỗi group chứa users
      group-value="groupId"          // グループID項目名 / key id của group
      group-label="groupName"        // グループ名項目名 / key tên của group
      user-value="userId"            // ユーザーID項目名 / key id của user
      user-key="userName"            // ユーザー名項目名 / key tên của user
      :check-disable="u => u.locked" // 選択/解除を禁止する判定 / hàm khoá chọn·bỏ chọn user
      @cancel="onCancel" />

  groups の形 / Cấu trúc groups:
    [{ groupId, groupName, users: [{ userId, userName, groups: [{ groupId, groupName }] }] }]
    先頭グループ（例: groupId 0「全て」）が「すべて」扱いになる想定。
    Group đầu tiên (vd groupId 0 "全て") đóng vai trò "tất cả".

  フラット版 / Biến thể phẳng (không nhóm):
    users prop を渡すとグループ機能を一切表示しない簡易版になる。
    Truyền prop `users` (mảng phẳng) để dùng bản đơn giản, ẩn hoàn toàn UI/logic nhóm.
    <UserSelectModal
      v-model="selectedIds"
      v-model:show="showPicker"
      :users="allUsers"            // ユーザー配列（グループ不要）/ mảng user phẳng
      user-value="userId"
      user-key="userName" />
-->
<script setup>
import { h } from 'vue'
/* ── Props / Emits ─────────────────────────────────────────── */
const props = defineProps({
  modelValue: { type: Array, default: () => [] }, // 選択ID配列 / mảng id đã chọn
  show: { type: Boolean, default: true }, // 表示 / hiển thị
  // グループ毎にユーザーを内包した配列 / mảng group, mỗi group chứa users
  groups: { type: Array, default: () => [] },
  // フラット版のユーザー配列（渡すとグループUI/ロジックを無効化）
  // mảng user phẳng — truyền vào để tắt hoàn toàn UI/logic nhóm
  users: { type: Array, default: null },
  // 各ユーザーの選択/解除を禁止する判定 / Hàm chặn chọn·bỏ chọn từng user (true = khoá)
  checkDisable: { type: Function, default: () => false },
  // 動的キー / key động — dev passes e.g. group-value="groupId"
  groupValue: { type: String, default: 'groupId' }, // グループID項目名
  groupLabel: { type: String, default: 'groupName' }, // グループ名項目名
  userValue: { type: String, default: 'userId' }, // ユーザーID項目名
  userKey: { type: String, default: 'userName' }, // ユーザー名項目名
  title: { type: String, default: '営業担当を選択' },
  subtitle: { type: String, default: 'クリックで即追加・選択済みはタブで確認' },
})

const emit = defineEmits(['update:modelValue', 'update:show', 'cancel'])
// フラット版か（users prop を渡したか）/ Có phải bản phẳng (đã truyền `users`)
const isFlat = computed(() => Array.isArray(props.users))
const tempSelected = ref([...props.modelValue]) // 選択中IDの一時コピー / bản sao tạm thời của id đã chọn
/* ── 動的キーのアクセサ / Accessor cho key động ─────────────── */
const gVal = g => g?.[props.groupValue] // グループID / id group
const gLabel = g => g?.[props.groupLabel] // グループ名 / tên group
const uVal = u => u?.[props.userValue] // ユーザーID / id user
const uLabel = u => u?.[props.userKey] // ユーザー名 / tên user

/* ── Local state ───────────────────────────────────────────── */
const tab = ref('cand') // 'cand' | 'chosen'
const query = ref('')
const group = ref(gVal(props.groups[0])) // 選択中グループ値 / giá trị group đang chọn (nhóm)
const ddOpen = ref(false)
const ddQuery = ref('')
const ddRef = ref(null)
const ddInputRef = ref(null)
const searchRef = ref(null)

const selectedIds = computed(() => tempSelected.value)

/* ── 全ユーザー（重複排除）/ Toàn bộ user (đã khử trùng lặp) ── */
const allUsers = computed(() => {
  const map = new Map()
  // フラット版は users prop をそのまま使う / Bản phẳng dùng thẳng prop `users`
  const source = isFlat.value
    ? [{ users: props.users }]
    : props.groups
  for (const g of source) {
    for (const u of (g.users || [])) {
      if (!map.has(uVal(u))) map.set(uVal(u), u)
    }
  }
  return [...map.values()]
})

/* ── Filtering / search ────────────────────────────────────── */
const norm = s => (s ?? '').toString().toLowerCase()
function groupNamesOf(u) {
  return (u.groups || []).map(g => gLabel(g) ?? gVal(g))
}
function matchUser(u, q) {
  if (!q.trim()) return true
  const n = norm(q.trim())
  return norm(uLabel(u)).includes(n) || groupNamesOf(u).some(gn => norm(gn).includes(n))
}

/* ── 選択中グループ / Group đang chọn ──────────────────────── */
const currentGroup = computed(() =>
  props.groups.find(g => gVal(g) === group.value) ?? props.groups[0],
)
const groupUsers = computed(() => currentGroup.value?.users || [])

// 候補の母集合 / Tập ứng viên: bản phẳng = toàn bộ user, bản nhóm = user của group đang chọn
const candidateUsers = computed(() => (isFlat.value ? allUsers.value : groupUsers.value))

const filteredUsers = computed(() =>
  candidateUsers.value.filter(u => matchUser(u, query.value)),
)
const selectedUsers = computed(() => allUsers.value.filter(u => isSelected(uVal(u))))
const rows = computed(() => (tab.value === 'cand' ? filteredUsers.value : selectedUsers.value))
// 選択/解除がロックされているか / User có bị khoá chọn·bỏ chọn không
const isDisabled = u => props.checkDisable(u)

const allOn = computed(() => {
  // ロック中を除いた選択可能ユーザーで判定 / Chỉ xét user có thể chọn (bỏ user bị khoá)
  const targets = filteredUsers.value.filter(u => !isDisabled(u))
  return targets.length > 0 && targets.every(u => isSelected(uVal(u)))
})

/* ── Selection helpers ─────────────────────────────────────── */
// tempSelected はユーザーオブジェクトの配列 / mảng object user, dedupe theo id
function isSelected(id) {
  return tempSelected.value.some(u => uVal(u) === id)
}

function commit(arr) {
  tempSelected.value = [...arr]
}
// id をキーにした Map で重複排除しつつオブジェクトを保持
// Map keyed by id để khử trùng lặp nhưng vẫn giữ nguyên object
function toggle(u) {
  if (isDisabled(u)) return // ロック中は無視 / Bị khoá thì bỏ qua
  const map = new Map(tempSelected.value.map(x => [uVal(x), x]))
  const id = uVal(u)
  map.has(id) ? map.delete(id) : map.set(id, u)
  commit([...map.values()])
}
function toggleAll() {
  const map = new Map(tempSelected.value.map(x => [uVal(x), x]))
  // ロック中ユーザーは一括操作の対象外 / User bị khoá không nằm trong thao tác hàng loạt
  const targets = filteredUsers.value.filter(u => !isDisabled(u))
  if (allOn.value) targets.forEach(u => map.delete(uVal(u)))
  else targets.forEach(u => map.set(uVal(u), u))
  commit([...map.values()])
}
function clearAll() {
  // ロック中の選択は残す / Giữ lại các lựa chọn đang bị khoá
  commit(tempSelected.value.filter(u => isDisabled(u)))
}

/* ── Group dropdown ────────────────────────────────────────── */
const filteredGroups = computed(() => {
  const n = norm(ddQuery.value.trim())
  return props.groups.filter(g => !n || norm(gLabel(g)).includes(n))
})
const currentGroupLabel = computed(() => gLabel(currentGroup.value) ?? '')
function pickGroup(val) {
  group.value = val
  ddOpen.value = false
  ddQuery.value = ''
}
const countByGroup = g => (g.users || []).length
const selByGroup = g => (g.users || []).filter(u => isSelected(uVal(u))).length

watch(ddOpen, (open) => {
  if (open) nextTick(() => ddInputRef.value?.focus())
})

/* ── Misc ──────────────────────────────────────────────────── */
const initial = u => (uLabel(u) || '?').trim().charAt(0).toUpperCase()
const groupPath = u => groupNamesOf(u).join(' / ')
function focusSearch() {
  searchRef.value?.focus()
}

/* ── Confirm / Cancel ──────────────────────────────────────── */
function onConfirm() {
  emit('update:modelValue', [...tempSelected.value])
  emit('update:show', false)
}
function onCancel() {
  emit('cancel')
  emit('update:show', false)
}

/* ── Click-outside để đóng dropdown / 外側クリックで閉じる ──── */
function onDocMouseDown(e) {
  if (ddOpen.value && ddRef.value && !ddRef.value.contains(e.target)) ddOpen.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocMouseDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocMouseDown))

/* ── Inline icons (render functions để khỏi lặp markup) ─────── */
function svg(children, w = 16) {
  return () =>
    h('svg', { width: w, height: w, viewBox: `0 0 ${w} ${w}`, fill: 'none' }, children)
}
function stroke(d, sw = 1.7) {
  return h('path', { d, 'stroke': 'currentColor', 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
}

const IconSearch = svg([h('circle', { 'cx': 7, 'cy': 7, 'r': 4.8, 'stroke': 'currentColor', 'stroke-width': 1.7 }), stroke('M11 11l3.5 3.5')])
const IconX = svg([stroke('M4 4l8 8M12 4l-8 8')])
const IconCheck = svg([stroke('M3 8l3.2 3.2L13 4.5', 2)], 16)
const IconChevron = svg([stroke('M4 6l4 4 4-4')])
const IconPlus = svg([stroke('M8 3.2v9.6M3.2 8h9.6', 1.8)])
</script>

<template>
  <transition name="usm-fade">
    <div v-if="show" class="usm-overlay" @mousedown.self="onCancel">
      <div class="usm-modal" role="dialog" aria-modal="true">
        <!-- ── Header ── -->
        <header class="usm-head">
          <div class="usm-head__txt">
            <h2 class="usm-head__title">
              {{ title }}
            </h2>
            <p class="usm-head__sub">
              {{ subtitle }}
            </p>
          </div>
          <button class="usm-head__x" type="button" aria-label="閉じる" @click="onCancel">
            <IconX />
          </button>
        </header>

        <!-- ── Tabs: 候補 / 選択済み ── -->
        <div class="usm-tabs" role="tablist">
          <button
            class="usm-tab" type="button" role="tab"
            :class="{ 'is-on': tab === 'cand' }"
            :aria-selected="tab === 'cand'"
            @click="tab = 'cand'"
          >
            候補
          </button>
          <button
            class="usm-tab" type="button" role="tab"
            :class="{ 'is-on': tab === 'chosen' }"
            :aria-selected="tab === 'chosen'"
            @click="tab = 'chosen'"
          >
            選択済み
            <span v-if="selectedIds.length" class="usm-tab__badge">{{ selectedIds.length }}</span>
          </button>
        </div>

        <!-- ── Toolbar (候補タブのみ): グループDD + 検索 ── -->
        <div v-if="tab === 'cand'" class="usm-toolbar">
          <!-- group dropdown / ドロップダウン (フラット版では非表示 / ẩn ở bản phẳng) -->
          <div v-if="!isFlat" ref="ddRef" class="usm-dd">
            <button
              class="usm-dd__trigger" type="button"
              :class="{ 'is-open': ddOpen }"
              @click="ddOpen = !ddOpen"
            >
              <span class="usm-dd__val">{{ currentGroupLabel }}</span>
              <IconChevron class="usm-dd__chev" :class="{ 'is-open': ddOpen }" />
            </button>

            <div v-if="ddOpen" class="usm-dd__panel">
              <div class="usm-dd__search">
                <IconSearch />
                <input
                  ref="ddInputRef" v-model="ddQuery" type="text"
                  placeholder="グループを絞り込む"
                >
              </div>
              <div class="usm-dd__opts">
                <button
                  v-for="g in filteredGroups" :key="gVal(g)"
                  class="usm-dd__opt" type="button"
                  :class="{ 'is-on': group === gVal(g) }"
                  @click="pickGroup(gVal(g))"
                >
                  <span class="usm-dd__dot" :style="{ background: hashColor(gLabel(g)) }" />
                  <span class="usm-dd__name">{{ gLabel(g) }}</span>
                  <span v-if="selByGroup(g)" class="usm-dd__sel">{{ selByGroup(g) }}選択</span>
                  <span class="usm-dd__count">{{ countByGroup(g) }}</span>
                  <IconCheck v-if="group === gVal(g)" class="usm-dd__tick" />
                </button>
                <div v-if="!filteredGroups.length" class="usm-dd__empty">
                  該当なし
                </div>
              </div>
            </div>
          </div>

          <!-- search field / 検索 -->
          <div class="usm-search" @click="focusSearch">
            <IconSearch />
            <input
              ref="searchRef" v-model="query" type="text"
              :placeholder="isFlat ? '名前で検索' : '名前・グループで検索'"
            >
            <button
              v-if="query" class="usm-search__x" type="button"
              aria-label="検索をクリア" @click.stop="query = ''"
            >
              <IconX />
            </button>
          </div>
        </div>

        <!-- ── Subbar: 一括操作 ── -->
        <div class="usm-subbar">
          <template v-if="tab === 'cand'">
            <span class="usm-subbar__n">表示中 <b>{{ filteredUsers.length }}</b> 名</span>
            <button
              v-if="filteredUsers.length" class="usm-link" type="button"
              @click="toggleAll"
            >
              <span class="usm-cb" :class="{ 'is-on': allOn }"><IconCheck /></span>
              {{ allOn ? 'すべて解除' : 'すべて選択' }}
            </button>
          </template>
          <template v-else>
            <span class="usm-subbar__n">選択済み <b>{{ selectedIds.length }}</b> 名</span>
            <button
              v-if="selectedIds.length" class="usm-link usm-link--danger" type="button"
              @click="clearAll"
            >
              <IconX />全削除
            </button>
          </template>
        </div>

        <!-- ── List ── -->
        <div class="usm-list">
          <div v-if="!rows.length" class="usm-empty">
            {{ tab === 'cand' ? '該当する担当者がいません' : 'まだ誰も選択していません' }}
          </div>

          <v-virtual-scroll
            :items="rows" :height="tab === 'cand' ? 332 : 425"
          >
            <template #default="{ item: u }">
              <div
                class="usm-row"
                :class="{
                  'is-on': tab === 'cand' && isSelected(uVal(u)),
                  'is-disabled': isDisabled(u),
                }"
                :aria-disabled="isDisabled(u)"
                @click="toggle(u)"
              >
                <span class="usm-av" :style="{ background: hashColor(uLabel(u)) }">{{ initial(u) }}</span>
                <span class="usm-row__main">
                  <span class="usm-row__name">{{ uLabel(u) }}</span>
                  <span v-if="groupPath(u)" class="usm-row__meta">{{ groupPath(u) }}</span>
                </span>
                <template v-if="tab === 'cand'">
                  <span class="usm-add" :class="{ 'is-on': isSelected(uVal(u)) }">
                    <IconCheck v-if="isSelected(uVal(u))" />
                    <IconPlus v-else />
                  </span>
                </template>
                <button
                  v-else class="usm-remove" type="button"
                  :disabled="isDisabled(u)" @click.stop="toggle(u)"
                >
                  <IconX />削除
                </button>
              </div>
            </template>
          </v-virtual-scroll>
        </div>

        <!-- ── Footer ── -->
        <footer class="usm-foot">
          <span class="usm-foot__count"><b>{{ selectedIds.length }}</b> 件 選択中</span>
          <div class="usm-foot__btns">
            <button class="usm-btn usm-btn--ghost" type="button" @click="onCancel">
              キャンセル
            </button>
            <button
              class="usm-btn usm-btn--primary" type="button"
              :disabled="!selectedIds.length" @click="onConfirm"
            >
              確定
            </button>
          </div>
        </footer>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* すべての色は :root の --t-* を参照（fallback はライト系）。
   Mọi màu đọc từ --t-* (fallback là tông sáng). */

.usm-overlay {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.42);
}

.usm-modal {
  width: 472px; max-width: 100%;
  max-height: min(88vh, 640px);
  display: flex; flex-direction: column;
  background: var(--t-modal-bg, rgba(255, 248, 240, 0.96));
  border: 1px solid var(--t-modal-border, rgba(217, 119, 6, 0.18));
  border-radius: 18px;
  backdrop-filter: var(--t-glass-blur, blur(20px) saturate(120%));
  -webkit-backdrop-filter: var(--t-glass-blur, blur(20px) saturate(120%));
  box-shadow: var(--t-island-shadow, 0 20px 60px rgba(180, 100, 0, 0.18));
  color: var(--t-modal-text, #1e293b);
  font-family: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', system-ui, sans-serif;
  overflow: hidden;
}

/* ── header ── */
.usm-head { display: flex; align-items: flex-start; gap: 12px; padding: 20px 20px 16px; }
.usm-head__txt { flex: 1; min-width: 0; }
.usm-head__title { margin: 0; font-size: 18px; font-weight: 700; color: var(--t-modal-text, #1e293b); }
.usm-head__sub { margin: 4px 0 0; font-size: 12.5px; color: var(--t-modal-subtext, #64748b); }
.usm-head__x {
  flex: none; width: 32px; height: 32px; border-radius: 9px; cursor: pointer;
  border: 1px solid var(--t-btn-secondary-border, rgba(249, 115, 22, 0.22));
  background: var(--t-btn-secondary-bg, rgba(249, 115, 22, 0.08));
  color: var(--t-text-secondary, #64748b);
  display: grid; place-items: center;
}
.usm-head__x:hover { background: var(--t-btn-secondary-hover, rgba(249, 115, 22, 0.16)); }

/* ── tabs ── */
.usm-tabs {
  display: flex; gap: 4px; margin: 0 20px 12px; padding: 4px;
  background: var(--t-input-bg, rgba(249, 115, 22, 0.06)); border-radius: 12px;
}
.usm-tab {
  flex: 1; padding: 8px 10px; border: 0; border-radius: 9px; cursor: pointer;
  font: inherit; font-size: 13.5px; font-weight: 600; background: none;
  color: var(--t-text-secondary, #64748b);
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
}
.usm-tab.is-on {
  background: var(--t-modal-bg, #fff); color: var(--t-text-primary, #1e293b);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.usm-tab__badge {
  font-size: 11px; font-weight: 700; color: #fff; padding: 1px 7px; border-radius: 999px;
  background: var(--t-accent, #ea580c);
}

/* ── toolbar ── */
.usm-toolbar { display: flex; gap: 10px; padding: 0 20px 12px; }

/* dropdown */
.usm-dd { position: relative; flex: 1; }
.usm-dd__trigger {
  width: 100%; height: 42px; padding: 0 12px; cursor: pointer; font: inherit; font-size: 13.5px;
  display: flex; align-items: center; gap: 8px; border-radius: 12px;
  background: var(--t-input-bg, rgba(249, 115, 22, 0.06));
  border: 1px solid var(--t-input-border, rgba(249, 115, 22, 0.18));
  color: var(--t-input-color, #1e293b);
}
.usm-dd__trigger.is-open {
  border-color: var(--t-input-focus-border, rgba(249, 115, 22, 0.45));
  box-shadow: var(--t-input-focus-shadow, 0 0 0 3px rgba(249, 115, 22, 0.10));
}
.usm-dd__val { flex: 1; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.usm-dd__chev { flex: none; color: var(--t-text-muted, #94a3b8); transition: transform .15s; }
.usm-dd__chev.is-open { transform: rotate(180deg); }

.usm-dd__panel {
  position: absolute; top: calc(100% + 6px); left: 0; z-index: 40;
  width: 252px; max-width: 78vw; overflow: hidden;
  display: flex; flex-direction: column; border-radius: 12px;
  background: var(--t-modal-bg, #fff8f0);
  border: 1px solid var(--t-modal-border, rgba(217, 119, 6, 0.18));
  box-shadow: var(--t-island-shadow, 0 12px 32px rgba(180, 100, 0, 0.18));
  backdrop-filter: var(--t-glass-blur, blur(20px) saturate(120%));
  -webkit-backdrop-filter: var(--t-glass-blur, blur(20px) saturate(120%));
}
.usm-dd__search {
  display: flex; align-items: center; gap: 8px; padding: 9px 11px;
  border-bottom: 1px solid var(--t-divider, rgba(0, 0, 0, 0.08));
  color: var(--t-text-muted, #94a3b8);
}
.usm-dd__search input {
  border: 0; outline: 0; background: none; font: inherit; font-size: 13px; width: 100%;
  color: var(--t-input-color, #1e293b);
}
.usm-dd__opts { max-height: 248px; overflow-y: auto; padding: 5px; }
.usm-dd__opt {
  width: 100%; display: flex; align-items: center; gap: 9px; cursor: pointer; text-align: left;
  padding: 9px 10px; border: 0; background: none; border-radius: 9px;
  font: inherit; font-size: 13.5px; color: var(--t-text-primary, #1e293b);
}
.usm-dd__opt:hover { background: var(--t-tbl-row-hover, rgba(249, 115, 22, 0.05)); }
.usm-dd__opt.is-on { background: var(--t-tbl-row-selected, rgba(249, 115, 22, 0.09)); }
.usm-dd__dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.usm-dd__name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.usm-dd__sel {
  font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 999px;
  color: var(--t-accent, #ea580c); background: rgba(var(--t-accent-rgb, 234, 88, 12), 0.14);
}
.usm-dd__count { font-size: 12px; color: var(--t-text-muted, #94a3b8); font-variant-numeric: tabular-nums; }
.usm-dd__tick { color: var(--t-accent, #ea580c); }
.usm-dd__empty { padding: 18px; text-align: center; font-size: 12.5px; color: var(--t-text-muted, #94a3b8); }

/* search field */
.usm-search {
  flex: 1; min-width: 0; height: 42px; padding: 0 12px; border-radius: 12px;
  display: flex; align-items: center; gap: 9px;
  background: var(--t-input-bg, rgba(249, 115, 22, 0.06));
  border: 1px solid var(--t-input-border, rgba(249, 115, 22, 0.18));
  color: var(--t-text-muted, #94a3b8);
}
.usm-search:focus-within {
  border-color: var(--t-input-focus-border, rgba(249, 115, 22, 0.45));
  box-shadow: var(--t-input-focus-shadow, 0 0 0 3px rgba(249, 115, 22, 0.10));
}
.usm-search input {
  border: 0; outline: 0; background: none; font: inherit; font-size: 13.5px; width: 100%;
  color: var(--t-input-color, #1e293b);
}
.usm-search input::placeholder { color: var(--t-text-placeholder, rgba(0, 0, 0, 0.30)); }
.usm-search__x {
  flex: none; border: 0; background: none; cursor: pointer; padding: 3px; border-radius: 50%;
  color: var(--t-text-muted, #94a3b8); display: grid; place-items: center;
}
.usm-search__x:hover { background: var(--t-tbl-row-hover, rgba(0, 0, 0, 0.06)); }

/* ── subbar ── */
.usm-subbar { display: flex; align-items: center; justify-content: space-between; padding: 0 20px 8px; }
.usm-subbar__n { font-size: 12.5px; color: var(--t-text-secondary, #64748b); }
.usm-subbar__n b { color: var(--t-text-primary, #1e293b); }
.usm-link {
  border: 0; background: none; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 600;
  padding: 5px 8px; border-radius: 9px; display: inline-flex; align-items: center; gap: 7px;
  color: var(--t-accent, #ea580c);
}
.usm-link:hover { background: rgba(var(--t-accent-rgb, 234, 88, 12), 0.1); }
.usm-link--danger { color: #e2554b; }
.usm-link--danger:hover { background: rgba(226, 85, 75, 0.12); }

/* ── list ── */
.usm-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 8px 6px; }
.usm-list::-webkit-scrollbar { width: 11px; }
.usm-list::-webkit-scrollbar-thumb {
  background: var(--t-scrollbar-thumb, rgba(234, 88, 12, 0.20));
  border-radius: 99px; border: 3px solid transparent; background-clip: padding-box;
}
.usm-row {
  display: flex; align-items: center; gap: 13px; cursor: pointer;
  padding: 11px 12px; border-radius: 12px; transition: background .12s;
}
.usm-row:hover { background: var(--t-tbl-row-hover, rgba(249, 115, 22, 0.05)); }
.usm-row.is-on { background: var(--t-tbl-row-selected, rgba(249, 115, 22, 0.09)); }
/* ロック中の行 / Hàng bị khoá — chặn tương tác + làm mờ */
.usm-row.is-disabled { opacity: .45; cursor: not-allowed; pointer-events: none; }
.usm-av {
  flex: none; width: 40px; height: 40px; border-radius: 50%;
  display: grid; place-items: center; color: #fff; font-weight: 700; font-size: 17px; line-height: 1;
}
.usm-row__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.usm-row__name { font-size: 14.5px; font-weight: 600; color: var(--t-text-primary, #1e293b); }
.usm-row__meta {
  font-size: 11.5px; color: var(--t-text-muted, #94a3b8);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* checkbox (select-all) */
.usm-cb {
  flex: none; width: 21px; height: 21px; border-radius: 6px;
  display: grid; place-items: center; transition: all .13s;
  border: 1.8px solid var(--t-chk-border, rgba(234, 88, 12, 0.35));
  background: var(--t-chk-bg, rgba(249, 115, 22, 0.06));
  color: var(--t-text-inverse, #fff);
}
.usm-cb > svg { opacity: 0; transform: scale(.5); transition: all .13s; }
.usm-cb.is-on {
  background: var(--t-chk-checked-bg, rgba(234, 88, 12, 0.80));
  border-color: var(--t-chk-checked-border, rgba(249, 115, 22, 0.45));
}
.usm-cb.is-on > svg { opacity: 1; transform: scale(1); }

/* add indicator (候補) */
.usm-add {
  flex: none; width: 30px; height: 30px; border-radius: 50%;
  display: grid; place-items: center; transition: all .13s;
  border: 1.5px solid var(--t-input-border, rgba(249, 115, 22, 0.18));
  color: var(--t-text-muted, #94a3b8);
}
.usm-add.is-on { background: var(--t-accent, #ea580c); border-color: var(--t-accent, #ea580c); color: #fff; }

/* remove button (選択済み) */
.usm-remove {
  flex: none; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600;
  padding: 6px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px;
  background: var(--t-btn-secondary-bg, rgba(249, 115, 22, 0.08));
  border: 1px solid var(--t-btn-secondary-border, rgba(249, 115, 22, 0.22));
  color: var(--t-btn-secondary-color, #9a3412);
}
.usm-remove:hover { background: var(--t-btn-secondary-hover, rgba(249, 115, 22, 0.16)); }

.usm-empty { padding: 44px 16px; text-align: center; font-size: 13px; color: var(--t-text-muted, #94a3b8); }

/* ── footer ── */
.usm-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 13px 20px; border-top: 1px solid var(--t-divider, rgba(0, 0, 0, 0.08));
}
.usm-foot__count { font-size: 13px; color: var(--t-text-secondary, #64748b); }
.usm-foot__count b { font-size: 15px; color: var(--t-accent, #ea580c); font-variant-numeric: tabular-nums; }
.usm-foot__btns { display: flex; gap: 9px; }
.usm-btn {
  cursor: pointer; font: inherit; font-size: 13.5px; font-weight: 700;
  padding: 10px 20px; border-radius: 12px; border: 0; transition: filter .13s, opacity .13s;
}
.usm-btn--ghost {
  background: var(--t-btn-secondary-bg, rgba(249, 115, 22, 0.08));
  border: 1px solid var(--t-btn-secondary-border, rgba(249, 115, 22, 0.22));
  color: var(--t-btn-secondary-color, #9a3412);
}
.usm-btn--ghost:hover { background: var(--t-btn-secondary-hover, rgba(249, 115, 22, 0.16)); }
.usm-btn--primary {
  background: var(--t-btn-primary-bg, linear-gradient(135deg, #f97316, #ea580c));
  color: var(--t-btn-primary-color, #fff);
  box-shadow: var(--t-btn-primary-shadow, 0 4px 14px rgba(234, 88, 12, 0.35));
}
.usm-btn--primary:hover { box-shadow: var(--t-btn-primary-hover-shadow, 0 6px 20px rgba(234, 88, 12, 0.45)); filter: brightness(1.04); }
.usm-btn--primary:disabled { opacity: .4; cursor: default; box-shadow: none; }

/* focus + transition */
.usm-modal :focus-visible { outline: 2px solid var(--t-accent, #ea580c); outline-offset: 2px; }
.usm-fade-enter-active, .usm-fade-leave-active { transition: opacity .18s ease; }
.usm-fade-enter-from, .usm-fade-leave-to { opacity: 0; }
.usm-fade-enter-active .usm-modal, .usm-fade-leave-active .usm-modal { transition: transform .2s ease; }
.usm-fade-enter-from .usm-modal { transform: translateY(8px) scale(.99); }
</style>
