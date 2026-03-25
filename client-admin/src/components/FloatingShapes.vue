<script setup>
// 漂浮变形色块组件
</script>

<template>
  <div class="shape-bg">
    <div class="shape shape-1"></div>
    <div class="shape shape-2"></div>
    <div class="shape shape-3"></div>
    <div class="shape shape-4"></div>
  </div>
</template>

<style scoped>
.shape-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.shape {
  position: absolute;
  animation: smoothMorph 24s cubic-bezier(0.45, 0.05, 0.2, 0.99) infinite;
  background: radial-gradient(circle at 35% 40%, rgba(254, 222, 101, 0.3), rgba(254, 222, 101, 0.1));
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.02);
}

/* 形状1 - 暖色大 */
.shape-1 {
  width: 500px;
  height: 500px;
  top: -120px;
  right: -100px;
  background: radial-gradient(circle at 35% 40%, rgba(254, 222, 101, 0.32), rgba(254, 222, 101, 0.1));
  animation-duration: 26s;
  animation-delay: 0s;
}

/* 形状2 - 冷色大 */
.shape-2 {
  width: 450px;
  height: 450px;
  bottom: -80px;
  left: -120px;
  background: radial-gradient(circle at 60% 55%, rgba(203, 244, 253, 0.35), rgba(203, 244, 253, 0.12));
  animation-duration: 28s;
  animation-delay: -3s;
}

/* 形状3 - 暖色中 */
.shape-3 {
  width: 380px;
  height: 380px;
  top: 45%;
  right: 5%;
  background: radial-gradient(circle at 55% 45%, rgba(254, 222, 101, 0.28), rgba(254, 222, 101, 0.09));
  animation-duration: 30s;
  animation-delay: -7s;
}

/* 形状4 - 冷色中 */
.shape-4 {
  width: 350px;
  height: 350px;
  bottom: 10%;
  left: 2%;
  background: radial-gradient(circle at 45% 50%, rgba(203, 244, 253, 0.3), rgba(203, 244, 253, 0.1));
  animation-duration: 32s;
  animation-delay: -12s;
}

/* 丝滑变形动画 */
@keyframes smoothMorph {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    border-radius: 52% 48% 50% 50% / 48% 52% 48% 52%;
  }
  15% {
    border-radius: 45% 55% 55% 45% / 50% 48% 52% 50%;
  }
  30% {
    transform: translate(35px, -25px) rotate(6deg) scale(1.02);
    border-radius: 40% 60% 58% 42% / 52% 48% 52% 48%;
  }
  45% {
    border-radius: 48% 52% 45% 55% / 48% 52% 48% 52%;
  }
  60% {
    transform: translate(-20px, 40px) rotate(-4deg) scale(0.98);
    border-radius: 55% 45% 48% 52% / 45% 55% 45% 55%;
  }
  75% {
    border-radius: 50% 50% 52% 48% / 52% 48% 52% 48%;
  }
  90% {
    transform: translate(25px, -15px) rotate(3deg) scale(1.01);
    border-radius: 48% 52% 50% 50% / 48% 52% 48% 52%;
  }
  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    border-radius: 52% 48% 50% 50% / 48% 52% 48% 52%;
  }
}

.shape-1 { animation-timing-function: cubic-bezier(0.42, 0, 0.2, 1); }
.shape-2 { animation-timing-function: cubic-bezier(0.38, 0, 0.25, 1); }
.shape-3 { animation-timing-function: cubic-bezier(0.45, 0, 0.18, 1); }
.shape-4 { animation-timing-function: cubic-bezier(0.4, 0, 0.22, 1); }
</style>
