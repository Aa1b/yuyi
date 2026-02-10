/**
 * 搜索生活记录
 * GET /life/search?keyword=关键词&page=1&pageSize=10
 */
// 模拟数据
const allRecords = [
  {
    id: 1,
    userId: 1,
    userName: '用户1',
    avatar: '/static/chat/avatar.png',
    content: '今天天气真好，和朋友一起去公园野餐～',
    images: ['/static/home/card0.png', '/static/home/card1.png'],
    video: null,
    type: 'image',
    privacy: 'public',
    category: '日常',
    tags: ['户外', '朋友', '野餐'],
    location: '北京·朝阳公园',
    likeCount: 15,
    commentCount: 3,
    isLiked: false,
    createdAt: '2024-01-15 14:30:00',
  },
  {
    id: 2,
    userId: 2,
    userName: '用户2',
    avatar: '/static/chat/avatar-Kingdom.png',
    content: '记录一次美好的旅行，山清水秀，心旷神怡',
    images: [],
    video: {
      url: '/static/video1.mp4',
      cover: '/static/home/card2.png',
      duration: 120,
    },
    type: 'video',
    privacy: 'public',
    category: '旅行',
    tags: ['旅行', '自然', '风景'],
    location: '云南·丽江',
    likeCount: 28,
    commentCount: 8,
    isLiked: true,
    createdAt: '2024-01-14 10:20:00',
  },
  {
    id: 3,
    userId: 3,
    userName: '用户3',
    avatar: '/static/chat/avatar-Mollymolly.png',
    content: '周末在家做的美食，简单又美味',
    images: ['/static/home/card3.png'],
    video: null,
    type: 'image',
    privacy: 'public',
    category: '美食',
    tags: ['美食', '家常菜'],
    location: null,
    likeCount: 42,
    commentCount: 12,
    isLiked: false,
    createdAt: '2024-01-13 18:45:00',
  },
];

export default {
  path: '/life/search',
  data: function(config) {
    // 解析查询参数
    const url = config.url || '';
    const urlParts = url.split('?');
    const queryString = urlParts[1] || '';
    const params = {};
    
    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      });
    }
    
    const keyword = params.keyword || '';
    const page = parseInt(params.page) || 1;
    const pageSize = parseInt(params.pageSize) || 10;
    const category = params.category || '';
    const type = params.type || 'all';
    
    if (!keyword.trim()) {
      return {
        code: 400,
        message: '搜索关键词不能为空',
        data: null,
      };
    }
    
    // 筛选数据
    let filteredRecords = allRecords.filter(record => {
      // 关键词搜索（内容或标签）
      if (keyword) {
        const keywordLower = keyword.toLowerCase();
        const contentMatch = record.content && record.content.toLowerCase().includes(keywordLower);
        const tagMatch = record.tags && record.tags.some(tag => tag.toLowerCase().includes(keywordLower));
        if (!contentMatch && !tagMatch) {
          return false;
        }
      }
      
      // 分类筛选
      if (category && record.category !== category) {
        return false;
      }
      
      // 类型筛选
      if (type !== 'all' && record.type !== type) {
        return false;
      }
      
      // 只显示公开记录
      if (record.privacy !== 'public') {
        return false;
      }
      
      return true;
    });
    
    // 分页
    const total = filteredRecords.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const list = filteredRecords.slice(startIndex, endIndex);
    
    return {
      code: 200,
      message: '搜索成功',
      data: {
        list,
        total,
        page,
        pageSize,
        keyword,
      },
    };
  },
};
