import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: '容易使用',
    src: require('@site/static/img/p5.png').default,
    description: (
      <>
        任何PC/MAC电脑无需安装软件即可访问服务软件,无需设计人员,技术人员参与.
      </>
    ),
  },
  {
    title: '免费模版',
    src: require('@site/static/img/p1.png').default,
    description: (
      <>
        丰富的模版库，免费使用，即见即所得、灵活设计定义布局.
      </>
    ),
  },
  {
    title: '丰富小插件',
    src: require('@site/static/img/p2.png').default,
    description: (
      <>
       支持视频无缝播放,图片列表播放,支持幻灯片,天气,时钟,新闻等插件.
      </>
    ),
  },
  {
    title: '模块化设计',
    src: require('@site/static/img/p4.png').default,
    description: (
      <>
       文件服务,单点登录,播放内容编译器,基础业务，数据库服务器容器化.
      </>
    ),
  },
  {
    title: '支持交互式页面发布',
    src: require('@site/static/img/p3.png').default,
    description: (
      <>
       静态网站, 交互式网站, 基于H5的应用系统都可以通过后台文件管理功能一健发布到终端.
      </>
    ),
  },
  {
    title: '高性能,高可靠性',
    src: require('@site/static/img/p6.png').default,
    description: (
      <>
       分布式,模块化设计使系统更容易扩展,更易维护.
      </>
    ),
  },
];

function Feature({src, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img className="feature" src={src} title={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
