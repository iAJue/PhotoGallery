### 我的二次元相册前端界面

1. 这里是阿珏酱的私人相册,保存着阿珏在平常收集的图片,和各大平台中点赞收藏的视频.
2. 包括但不限于B站,YouTube,抖音,X,facebook,pixiv等平台的视频或图片,相关的数据信息版权归原作者所有.
3. 数据将不定期手动更新,如果你想要某些图片或者视频,请直接联系阿珏酱获取.

## 预览
https://photo.moejue.cn

![image](./public/images/1.png)
![image](./public/images/2.png)
![image](./public/images/3.png)


## 特性

1. 支持图片和视频的展示
2. 支持相册的展示
3. 支持相册的密码保护
4. 支持18+保护
5. 支持搜索

## Todo
1. 优化特效展示
2. 优化界面流畅度


## 安装说明

1. 克隆仓库到本地：
   ```bash
   git clone https://github.com/iAJue/PhotoGallery.git
   ```

2. 进入项目目录：
   ```bash
   cd PhotoGallery
   ```

3. 安装依赖：
   ```bash
   npm install
   ```

4. 打包项目
   ```bash
   npm run build
   ```


## 后端接口
仅供参考
https://github.com/iAJue/wasteCode/tree/main/photo


## 返回数据格式

1. 照片接口
```json
[
    {
        "date": "\u6628\u5929",
        "items": [
            {
                "src": "https:\/\/moejuevideo.pages.dev\/file\/1730957555106_ocgRCdDEA07fAILEKEFOA8ADAyETABBMffIBE6~tplv-dy-aweme-images_q75.webp",
                "alt": "ocgRCdDEA07fAILEKEFOA8ADAyETABBMffIBE6~tplv-dy-aweme-images_q75.webp",
                "isVideo": false,
                "duration": null
            }
        ]
    }
]
```

2. 相册接口
```json
   [
    {
        "folder_id": "3",
        "folder_name": "images",
        "created_at": "2024-11-07 15:09:06",
        "photo_count": "61",
        "latest_image": "https:\/\/moejuevideo.pages.dev\/file\/1730963758087_GZIaBGlbAAALz_E.jpeg",
        "attribute": "2",
        "ispassword": true
    }
]
```
3. 随机接口
```json
[
    {
        "id": 1,
        "folder_id": 1,
        "name": "\u300c\u4e0d\u706d\u300d #2024\u539f\u795e\u751f\u65e5\u4f1a #\u539f\u795e #\u949f\u79bb_7415149072572501275.mp4",
        "size": 50437932,
        "duration": "19.0",
        "type": 1,
        "data": "https:\/\/moejuevideo.pages.dev\/file\/1730944134269_\u300c\u4e0d\u706d\u300d %232024\u539f\u795e\u751f\u65e5\u4f1a %23\u539f\u795e %23\u949f\u79bb_7415149072572501275.mp4_part_1.mp4",
        "created_at": "2024-11-07 09:49:48"
    }
]
```