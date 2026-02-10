/**
 * 获取生活记录列表
 * GET /life/list
 * query: { page: 1, pageSize: 10, category: '', tag: '', privacy: 'all'|'public'|'private'|'friends', type: 'all'|'image'|'video' }
 */
// 模拟的生活记录数据（列表视图，不包含评论详情）
const allRecords = [
  {
    id: 1,
    userId: 1,
    userName: '用户1',
    avatar: '/static/chat/avatar.png',
    content: '今天天气真好，和朋友一起去公园野餐～',
    images: ['/static/home/card0.png', '/static/home/card1.png'],
    video: null,
    type: 'image', // image | video
    privacy: 'public', // public | private | friends
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
    privacy: 'friends',
    category: '美食',
    tags: ['美食', '家常菜'],
    location: null,
    likeCount: 42,
    commentCount: 12,
    isLiked: false,
    createdAt: '2024-01-13 18:45:00',
  },
  {
    id: 4,
    userId: 1,
    userName: '用户1',
    avatar: '/static/chat/avatar.png',
    content: '深夜的思考，记录这一刻的心情',
    images: [],
    video: null,
    type: 'image',
    privacy: 'private',
    category: '心情',
    tags: ['心情', '日记'],
    location: null,
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    createdAt: '2024-01-12 23:10:00',
  },
  {
    id: 5,
    userId: 2,
    userName: '用户2',
    avatar: '/static/chat/avatar-Kingdom.png',
    content: '晨跑打卡，新的一天开始了！',
    images: ['/static/home/card4.png'],
    video: null,
    type: 'image',
    privacy: 'public',
    category: '运动',
    tags: ['运动', '晨跑'],
    location: '北京·奥林匹克公园',
    likeCount: 56,
    commentCount: 15,
    isLiked: false,
    createdAt: '2024-01-11 07:30:00',
  },
  {
    id: 6,
    userId: 4,
    userName: '用户4',
    avatar: '/static/chat/avatar-Paige.png',
    content: '今天学习了新的知识点，记录一下',
    images: [],
    video: null,
    type: 'image',
    privacy: 'public',
    category: '学习',
    tags: ['学习', '笔记'],
    location: null,
    likeCount: 23,
    commentCount: 5,
    isLiked: true,
    createdAt: '2024-01-10 20:15:00',
  },
];

export default {
  path: '/life/list',
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
    
    const page = parseInt(params.page) || 1;
    const pageSize = parseInt(params.pageSize) || 10;
    const category = params.category || '';
    const privacy = params.privacy || 'public';
    const type = params.type || 'all';
    
    // 筛选数据
    let filteredRecords = allRecords.filter(record => {
      // 隐私筛选
      if (privacy !== 'all' && record.privacy !== privacy) {
        return false;
      }
      
      // 分类筛选
      if (category && record.category !== category) {
        return false;
      }
      
      // 类型筛选
      if (type !== 'all' && record.type !== type) {
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
      message: '获取成功',
      data: {
        list,
        total,
        page,
        pageSize,
      },
    };
  },
};
