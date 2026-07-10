<!-- components/common/AppThumbnail.vue -->
<!--
  Component hiển thị thumbnail với lazy load + skeleton + fallback icon.
  lazy load + skeleton + フォールバックアイコン付きサムネイル表示コンポーネント。

  Dùng cho mọi feature — address, bbs, contract, ...
  全機能（address、bbs、contract等）で使用。

  Cách dùng / 使い方:
    <AppThumbnail
      feature="address"
      :feature-id="address.addressId"
      :file-no="1"
      :filename="address.originalFilename"
      preset="sm"
      :width="80"
      :height="80"
    />

  Thay thế trực tiếp đoạn code cũ trong AddressDetailPanel:
  AddressDetailPanelの旧コードを直接置き換え:
    BEFORE:
      <img :src="bizCardPresignedUrl" @error="onImageLoadError">
    AFTER:
      <AppThumbnail feature="address" :feature-id="contact.addressId" ... />
-->
<script setup lang="ts">
import type { ThumbnailFeature, ThumbnailPreset } from '~/composables/thumbnail/useThumbnail'
import { onMounted, watch } from 'vue'
import { useThumbnailUrl } from '~/composables/thumbnail/useThumbnail'

// ── Props ─────────────────────────────────────────────────────────
const props = withDefaults(defineProps<{
  /** Feature name — phải có trong ThumbnailFeature enum backend */
  /** バックエンドのThumbnailFeature enumに存在する必要がある機能名 */
  feature: ThumbnailFeature

  /** ID của record liên quan / 関連レコードID */
  featureId: number | null | undefined

  /** Số thứ tự file, bắt đầu từ 1 / ファイル連番（1始まり） */
  fileNo?: number

  /** Tên file gốc — cần để build S3 key / S3キー構築に必要な元ファイル名 */
  filename: string

  /** Preset size / サイズプリセット */
  preset?: ThumbnailPreset

  /** Width px cho img element / imgエレメントの幅px */
  width?: number

  /** Height px cho img element / imgエレメントの高さpx */
  height?: number

  /** Alt text / 代替テキスト */
  alt?: string

  /** CSS class thêm vào img / imgに追加するCSSクラス */
  imgClass?: string
}>(), {
  fileNo: 1,
  preset: undefined,
  width: undefined,
  height: undefined,
  alt: '',
  imgClass: '',
})

// ── Composable ────────────────────────────────────────────────────
const {
  url,
  loading,
  error,
  fetch,
  clear,
  onImageError,
} = useThumbnailUrl(
  props.feature,
  // Truyền featureId dạng getter để reactive khi prop thay đổi
  // propが変わったときにリアクティブになるようgetterとして渡す
  computed(() => props.featureId),
  props.fileNo,
  props.filename,
  props.preset,
)

// ── Watch featureId — fetch khi prop thay đổi ────────────────────
// featureIdが変わったときにfetchする
watch(
  () => props.featureId,
  (newId) => {
    if (newId) fetch()
    else clear()
  },
  { immediate: true },
)
</script>

<template>
  <!--
    Skeleton khi đang resolve URL / URL解決中のスケルトン
    Dùng cùng kích thước với img để không bị layout shift.
    レイアウトシフトを防ぐためimgと同じサイズを使用。
  -->
  <div
    v-if="loading"
    class="t-skeleton animate-pulse rounded-lg"
    :style="{
      width: width ? `${width}px` : '100%',
      height: height ? `${height}px` : '80px',
    }"
  />

  <!--
    Placeholder khi không có ảnh hoặc lỗi load.
    画像なしまたはロードエラー時のプレースホルダー。
    UI hiển thị icon mdi-image-off — không throw, không crash.
    アイコンmdi-image-offを表示 — スローしない、クラッシュしない。
  -->
  <div
    v-else-if="!url || error"
    class="t-glass t-text-muted flex items-center justify-center rounded-lg"
    :style="{
      width: width ? `${width}px` : '100%',
      height: height ? `${height}px` : '80px',
    }"
  >
    <v-icon size="20">
      mdi-image-off-outline
    </v-icon>
  </div>

  <!--
    Ảnh thực — fetch thẳng từ S3 qua presigned URL.
    実際の画像 — presigned URLでS3から直接取得。
    Spring Boot KHÔNG stream bytes — không bottleneck.
    Spring Bootはバイトをストリームしない — ボトルネックなし。
  -->
  <img
    v-else
    :src="url"
    :alt="alt"
    :width="width"
    :height="height"
    loading="lazy"
    decoding="async"
    class="rounded-lg object-cover"
    :class="imgClass"
    @error="onImageError"
  >
</template>
