<script setup>
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Refresh } from '@element-plus/icons-vue'
import { getCategoryList, addCategory, updateCategory, deleteCategory } from '@/api/category'

// 分类列表
const categoryList = ref([])
const loading = ref(false)

// 弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('添加分类')
const submitting = ref(false)

// 表单
const formRef = ref(null)
const form = reactive({
  id: null,
  name: '',
  parent_id: 0,
  sort: 0
})

// 父分类选项
const parentOptions = ref([])

// 表单验证
const rules = {
  name: [
    {required: true, message: '请输入分类名称', trigger: 'blur'},
    {min: 2, max: 20, message: '长度2-20位', trigger: 'blur'}
  ]
}

// 获取分类列表
const loadCategoryList = async () => {
  loading.value = true
  try {
    const res = await getCategoryList()
    if (res.code === 200) {
      categoryList.value = res.data || []
      // 构建父分类选项（用于弹窗）
      const buildOptions = (list, level = 0) => {
        let options = []
        for (const item of list) {
          options.push({
            id: item.id,
            name: '　'.repeat(level) + item.name
          })
          if (item.children && item.children.length) {
            options.push(...buildOptions(item.children, level + 1))
          }
        }
        return options
      }
      parentOptions.value = [
        {id: 0, name: '作为一级分类'},
        ...buildOptions(res.data || [])
      ]
    }
  } catch (err) {
    console.error('获取分类列表失败', err)
    ElMessage.error('获取分类列表失败')
  } finally {
    loading.value = false
  }
}

// 打开添加父分类弹窗
const handleAddParent = () => {
  dialogTitle.value = '添加一级分类'
  form.id = null
  form.name = ''
  form.parent_id = 0
  dialogVisible.value = true
}

// 打开添加子分类弹窗
const handleAddChild = (parentId, parentName) => {
  dialogTitle.value = `添加子分类 - ${parentName}`
  form.id = null
  form.name = ''
  form.parent_id = parentId
  dialogVisible.value = true
}

// 编辑分类
const handleEdit = (row) => {
  dialogTitle.value = row.parent_id === 0 ? '编辑一级分类' : '编辑子分类'
  form.id = row.id
  form.name = row.name
  form.parent_id = row.parent_id
  dialogVisible.value = true
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
  } catch (err) {
    return
  }

  submitting.value = true
  try {
    const submitData = {
      name: form.name,
      parent_id: form.parent_id
      // 移除 sort: form.sort || 0
    }

    let res
    if (form.id) {
      res = await updateCategory(form.id, submitData)
    } else {
      res = await addCategory(submitData)
    }

    if (res.code === 200) {
      ElMessage.success(form.id ? '更新成功' : '添加成功')
      dialogVisible.value = false
      loadCategoryList()
    }
  } catch (err) {
    console.error('操作失败', err)
  } finally {
    submitting.value = false
  }
}

// 删除分类
const handleDelete = (row) => {
  const hasChildren = row.children && row.children.length > 0
  ElMessageBox.confirm(
    hasChildren
      ? `确定要删除分类 "${row.name}" 吗？该分类下有 ${row.children.length} 个子分类，删除后子分类也会被删除。`
      : `确定要删除分类 "${row.name}" 吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const res = await deleteCategory(row.id)
      if (res.code === 200) {
        ElMessage.success('删除成功')
        loadCategoryList()
      }
    } catch (err) {
      console.error('删除失败', err)
    }
  }).catch(() => {
  })
}

onMounted(() => {
  loadCategoryList()
})
</script>

<template>
  <div class="categories-page">
    <!-- 头部操作栏 -->
    <div class="action-bar">
      <el-button type="primary" @click="handleAddParent">
        <el-icon>
          <Plus/>
        </el-icon>
        添加一级分类
      </el-button>
      <el-button @click="loadCategoryList">
        <el-icon>
          <Refresh/>
        </el-icon>
        刷新
      </el-button>
    </div>

    <!-- 卡片式分类列表 -->
    <div v-loading="loading" class="categories-grid">
      <div
        v-for="parent in categoryList"
        :key="parent.id"
        class="category-card"
      >
        <!-- 卡片头部 -->
        <div class="card-header">
          <div class="header-left">
            <h3>{{ parent.name }}</h3>
            <span class="child-count">{{ parent.children?.length || 0 }}个子分类</span>
          </div>
          <div class="header-actions">
            <el-button type="primary" link size="small" @click="handleEdit(parent)">
              <el-icon>
                <Edit/>
              </el-icon>
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(parent)">
              <el-icon>
                <Delete/>
              </el-icon>
            </el-button>
          </div>
        </div>

        <!-- 子分类标签列表 -->
        <div class="child-list">
          <div
            v-for="child in parent.children"
            :key="child.id"
            class="child-tag"
          >
            <span class="child-name">{{ child.name }}</span>
            <div class="child-actions">
              <el-button type="primary" link size="small" @click="handleEdit(child)">
                <el-icon>
                  <Edit/>
                </el-icon>
              </el-button>
              <el-button type="danger" link size="small" @click="handleDelete(child)">
                <el-icon>
                  <Delete/>
                </el-icon>
              </el-button>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="!parent.children?.length" class="empty-child">
            <span>暂无子分类</span>
          </div>
        </div>

        <!-- 底部添加按钮 -->
        <div class="card-footer">
          <el-button
            type="primary"
            link
            class="add-child-btn"
            @click="handleAddChild(parent.id, parent.name)"
          >
            <el-icon>
              <Plus/>
            </el-icon>
            添加子分类
          </el-button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="categoryList.length === 0 && !loading" class="empty-categories">
        <el-empty description="暂无分类，点击上方按钮添加一级分类"/>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="450px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称"/>
        </el-form-item>
        <el-form-item v-if="form.parent_id !== 0" label="父分类">
          <el-select v-model="form.parent_id" disabled style="width: 100%">
            <el-option
              v-for="item in parentOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.categories-page {
  background: #fafdf7;
  padding: 0;
}

/* 操作栏 */
.action-bar {
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 24px;
  display: flex;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* 卡片网格 */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
}

/* 分类卡片 - 统一白色背景 */
.category-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #eef2f0;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  border-color: #d4decb;
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #eef2f0;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.card-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e4e;
  margin: 0;
}

.child-count {
  font-size: 12px;
  color: #8faa8a;
  background: #f5f9f2;
  padding: 2px 8px;
  border-radius: 20px;
}

.header-actions {
  display: flex;
  gap: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.category-card:hover .header-actions {
  opacity: 1;
}

/* 子分类列表 */
.child-list {
  min-height: 120px;
  max-height: 280px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.child-tag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #fafdf7;
  border-radius: 12px;
  transition: all 0.2s;
  border: 1px solid #eef2f0;
}

.child-tag:hover {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-color: #d4decb;
}

.child-name {
  font-size: 14px;
  color: #5a6e7c;
}

.child-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.child-tag:hover .child-actions {
  opacity: 1;
}

.empty-child {
  text-align: center;
  padding: 24px;
  color: #b8c4ae;
  font-size: 13px;
}

/* 卡片底部 */
.card-footer {
  padding-top: 12px;
  border-top: 1px solid #eef2f0;
  text-align: center;
}

.add-child-btn {
  color: #8faa8a;
  font-size: 13px;
}

.add-child-btn:hover {
  color: #6b8c69;
}

/* 空状态 */
.empty-categories {
  grid-column: 1 / -1;
  padding: 60px 0;
}

/* 滚动条 */
.child-list::-webkit-scrollbar {
  width: 4px;
}

.child-list::-webkit-scrollbar-track {
  background: #f0ede8;
  border-radius: 2px;
}

.child-list::-webkit-scrollbar-thumb {
  background: #d4decb;
  border-radius: 2px;
}
</style>
