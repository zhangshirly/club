module.exports = {
    // 站点相关，项目名
    name: '移动开发组件',
    // 子模块名称
    subMoudle: '/',
    // webpack: js 模块化相关
    webpack: {
        entry: {
            'jquery': [
                './source/libs/jquery-2.1.0.min.js'
            ]

        },
        output: {
            filename: '[name].js'
        }
    },
    // alloykit 离线相关
    zipBlacklist: [],
    // 使用 alloydist 发布离线包
    offline: {},
    distId: '',
    token: 'ASdxseRTSXfiGUIxnuRisTU'
};
