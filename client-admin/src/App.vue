<script setup>
import {RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
/* 全局样式 - 重置所有页面 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
}

#app {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
}
</style>
