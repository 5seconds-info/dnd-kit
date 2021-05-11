import React, {
  useState,
  useEffect,
  useMemo,
  useContext,
  createContext,
} from 'react';
import {useRouter} from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import 'focus-visible';
import {SkipNavContent} from '@reach/skip-nav';
import {ThemeProvider} from 'next-themes';
import innerText from 'react-innertext';
import cn from 'classnames';

import flatten from './utils/flatten';
import cleanupAndReorder from './utils/cleanup-and-reorder';

import Search from './search';
import StorkSearch from './stork-search';
import GitHubIcon from './github-icon';
import ThemeSwitch from './theme-switch';
import LocaleSwitch from './locale-switch';
import Footer from './footer';
import renderComponent from './utils/render-component';

import Theme from './misc/theme';
import {Anchors, ActiveAnchor} from './components';
import defaultConfig from './misc/default.config';

const TreeState = new Map();
const titleType = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const MenuContext = createContext(false);

const getFSRoute = (asPath, locale) => {
  if (!locale) return asPath.replace(new RegExp('/index(/|$)'), '$1');

  return asPath
    .replace(new RegExp(`\.${locale}(\/|$)`), '$1')
    .replace(new RegExp('/index(/|$)'), '$1');
};

function Folder({depth, item}) {
  const {asPath, locale} = useRouter();
  const route = getFSRoute(asPath, locale) + '/';
  const active = route === item.route + '/';
  const {defaultMenuCollapsed} = useContext(MenuContext);
  const open = TreeState[item.route] ?? !defaultMenuCollapsed;
  const [_, render] = useState(false);

  useEffect(() => {
    if (active) {
      TreeState[item.route] = true;
    }
  }, [active]);

  return (
    <li className={open ? 'active' : ''}>
      {depth > 0 ? (
        <button
          onClick={() => {
            if (active) return;
            TreeState[item.route] = !open;
            render((x) => !x);
          }}
        >
          {item.title}
        </button>
      ) : (
        <h5 className="p-2 mt-6 uppercase text-xs text-gray-500">
          {item.title}
        </h5>
      )}
      <div
        style={{
          display: open ? 'initial' : 'none',
        }}
      >
        <Menu dir={item.children} base={item.route} depth={depth + 1} />
      </div>
    </li>
  );
}

function File({item}) {
  const {setMenu} = useContext(MenuContext);
  const {asPath, locale} = useRouter();
  const route = getFSRoute(asPath, locale) + '/';
  const active = route === item.route + '/';
  const {title} = item;

  return (
    <li className={active ? 'active' : ''}>
      <Link href={item.route}>
        <a onClick={() => setMenu(false)}>{title}</a>
      </Link>
    </li>
  );
}

function Menu({depth = 0, dir}) {
  return (
    <ul>
      {dir.map((item) => {
        if (item.children) {
          return <Folder depth={depth} key={item.name} item={item} />;
        }
        return <File key={item.name} item={item} />;
      })}
    </ul>
  );
}

function Sidebar({show, directories}) {
  return (
    <aside
      className={`h-screen bg-white dark:bg-dark flex-shrink-0 w-full md:w-64 md:block fixed md:sticky z-10 ${
        show ? '' : 'hidden'
      }`}
      style={{
        top: '4rem',
        height: 'calc(100vh - 4rem)',
      }}
    >
      <div className="sidebar border-gray-200 dark:border-gray-900 w-full p-4 pb-40 md:pb-16 h-full overflow-y-auto">
        <div>
          <h5 className="p-2 mt-6 uppercase text-xs text-gray-500">Concepts</h5>
          <a href="/api-documentation/draggable">{draggable}</a>
          <a href="/api-documentation/droppable">{droppable}</a>
        </div>
        <Menu dir={directories} />
      </div>
    </aside>
  );
}

const Layout = ({filename, config: _config, pageMap, meta, children}) => {
  const [menu, setMenu] = useState(false);
  const router = useRouter();
  const {route, asPath, locale, defaultLocale} = router;
  const fsPath = getFSRoute(asPath, locale);

  const directories = useMemo(
    () => cleanupAndReorder(pageMap, locale, defaultLocale),
    [pageMap, locale, defaultLocale]
  );
  const flatDirectories = useMemo(() => flatten(directories), [directories]);
  const config = Object.assign({}, defaultConfig, _config);

  const filepath = route.slice(0, route.lastIndexOf('/') + 1);
  const filepathWithName = filepath + filename;
  const titles = React.Children.toArray(children).filter((child) =>
    titleType.includes(child.props.mdxType)
  );
  const titleEl = titles.find((child) => child.props.mdxType === 'h1');
  const title =
    meta.title || (titleEl ? innerText(titleEl.props.children) : 'Untitled');
  const anchors = titles
    .filter(
      (child) => child.props.mdxType === 'h2' || child.props.mdxType === 'h3'
    )
    .map((child) => ({
      value: child.props.children,
      depth: child.props.mdxType === 'h2' ? 0 : 1,
    }));

  useEffect(() => {
    if (menu) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
  }, [menu]);

  const currentIndex = useMemo(
    () => flatDirectories.findIndex((dir) => dir.route === fsPath),
    [flatDirectories, fsPath]
  );

  const isRTL = useMemo(() => {
    if (!config.i18n) return config.direction === 'rtl' || null;
    const localeConfig = config.i18n.find((l) => l.locale === locale);
    return localeConfig && localeConfig.direction === 'rtl';
  }, [config.i18n, locale]);

  return (
    <React.Fragment>
      <Head>
        {config.font ? (
          <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        ) : null}
        <title>
          {title}
          {renderComponent(config.titleSuffix, {locale})}
        </title>
        {config.font ? (
          <style
            dangerouslySetInnerHTML={{
              __html: `html{font-family:Inter,sans-serif}@supports(font-variation-settings:normal){html{font-family:'Inter var',sans-serif}}`,
            }}
          />
        ) : null}
        {renderComponent(config.head, {locale})}
      </Head>
      <div
        className={cn(
          'nextra-container main-container flex flex-col font-sans antialiased',
          {
            rtl: isRTL,
          }
        )}
      >
        <nav className="w-full sticky top-0 z-30 h-[72px] bg-white dark:bg-gray-900 xl:px-8">
          <div className="flex max-w-8xl mx-auto items-center justify-between px-4 py-5 border-b lg:px-8 sm:px-6 xl:px-0 border-gray-300 dark:border-gray-800">
            <div className="hidden md:block flex items-center">
              <Link href="/">
                <a className="no-underline text-current flex items-center hover:opacity-75 inline-block">
                  {renderComponent(config.logo, {locale})}
                </a>
              </Link>
            </div>

            {config.customSearch ||
              (config.search ? (
                config.UNSTABLE_stork ? (
                  <StorkSearch />
                ) : (
                  <Search directories={flatDirectories} />
                )
              ) : null)}

            {config.darkMode ? <ThemeSwitch /> : null}

            {config.i18n ? (
              <LocaleSwitch options={config.i18n} isRTL={isRTL} />
            ) : null}

            {config.repository ? (
              <a
                className="text-current p-2"
                href={config.repository}
                target="_blank"
                rel="noreferrer"
              >
                <GitHubIcon height={24} />
              </a>
            ) : null}

            <button
              className="block md:hidden p-2"
              onClick={() => setMenu(!menu)}
            >
              <svg
                fill="none"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </nav>
        <ActiveAnchor>
          <div className="w-full flex mx-auto max-w-8xl">
            <MenuContext.Provider
              value={{
                setMenu,
                defaultMenuCollapsed: !!config.defaultMenuCollapsed,
              }}
            >
              <Sidebar show={menu} directories={directories} />
            </MenuContext.Provider>
            <SkipNavContent />
            {meta.full ? (
              <article className="relative pt-16 w-full overflow-x-hidden">
                {children}
              </article>
            ) : (
              <article className="docs-container w-full relative pt-20 pb-16 px-6 md:px-8 w-full max-w-full overflow-x-hidden">
                <main className="max-w-screen-md mx-auto">
                  <Theme>{children}</Theme>
                  <Footer
                    config={config}
                    flatDirectories={flatDirectories}
                    currentIndex={currentIndex}
                    filepathWithName={filepathWithName}
                    isRTL={isRTL}
                  />
                </main>
              </article>
            )}
            <div className="hidden xl:text-sm xl:block flex-none w-64 pl-8 mr-8">
              {anchors.length ? (
                <div className="flex flex-col sticky pt-10 pb-6 top-16">
                  <h6 className="mb-4 uppercase text-xs text-gray-500">
                    Contents
                  </h6>
                  <Anchors items={anchors} />
                </div>
              ) : null}
            </div>
          </div>
        </ActiveAnchor>
      </div>
    </React.Fragment>
  );
};

export default (opts, config) => (props) => {
  return (
    <ThemeProvider attribute="class">
      <Layout config={config} {...opts} {...props} />
    </ThemeProvider>
  );
};

const draggable = (
  <svg
    width="70"
    height="16"
    viewBox="0 0 140 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="32" height="32" rx="5" fill="url(#purple_gradient)" />
    <rect
      x="0.5"
      y="0.5"
      width="31"
      height="31"
      rx="4.5"
      stroke="black"
      stroke-opacity="0.08"
    />
    <path
      d="M28 15.9887L24.5666 19.4222L23.5874 18.443L25.3463 16.6842L19.1788 16.69L19.1801 15.3041L25.3476 15.2983L23.5921 13.5427L24.573 12.5617L28 15.9887ZM4 16.0113L7.43341 12.5778L8.41255 13.557L6.65369 15.3158L12.8212 15.3101L12.8199 16.6959L6.65238 16.7017L8.40794 18.4573L7.42698 19.4383L4 16.0113ZM19.4383 7.427L18.4574 8.40798L16.7018 6.6524L16.696 12.8199L15.3101 12.8212L15.3159 6.65371L13.5571 8.41258L12.5779 7.43344L16.0114 4L19.4383 7.427ZM16.69 19.1788L16.6843 25.3463L18.4431 23.5874L19.4223 24.5665L15.9888 28L12.5618 24.573L13.5428 23.592L15.2984 25.3476L15.3042 19.1801L16.69 19.1788Z"
      fill="#F7F8FF"
      stroke="white"
      stroke-width="0.5"
    />
    <path
      d="M45 16.0612C45 14.3418 45.3868 12.9725 46.1606 11.9531C46.9343 10.9337 47.9926 10.4241 49.3355 10.4241C50.4125 10.4241 51.3021 10.825 52.0042 11.6269V6H54.9695V21.6575H52.3008L52.1576 20.4852C51.4214 21.4027 50.4739 21.8614 49.315 21.8614C48.013 21.8614 46.9683 21.35 46.181 20.3272C45.3937 19.3044 45 17.8824 45 16.0612ZM47.9551 16.2752C47.9551 17.3082 48.1357 18.0999 48.497 18.6504C48.8583 19.2008 49.3832 19.476 50.0717 19.476C50.9851 19.476 51.6293 19.0921 52.0042 18.3242V13.9715C51.6361 13.2035 50.9988 12.8196 50.0921 12.8196C48.6674 12.8196 47.9551 13.9714 47.9551 16.2752ZM63.7348 13.3904C63.3326 13.3361 62.9781 13.3089 62.6714 13.3089C61.5534 13.3089 60.8206 13.686 60.473 14.4404V21.6575H57.5179V10.6279H60.3094L60.3912 11.9429C60.9842 10.9303 61.8056 10.4241 62.8554 10.4241C63.1826 10.4241 63.4894 10.4682 63.7757 10.5566L63.7348 13.3904ZM71.5185 21.6575C71.3821 21.3925 71.2833 21.0629 71.2219 20.6687C70.5062 21.4638 69.5757 21.8614 68.4305 21.8614C67.3466 21.8614 66.4485 21.5488 65.7361 20.9235C65.0238 20.2983 64.6676 19.51 64.6676 18.5586C64.6676 17.3897 65.1022 16.4927 65.9713 15.8675C66.8405 15.2423 68.0964 14.9263 69.7393 14.9195H71.0992V14.2875C71.0992 13.7778 70.968 13.37 70.7056 13.0642C70.4431 12.7584 70.029 12.6055 69.4632 12.6055C68.9656 12.6055 68.5753 12.7244 68.2924 12.9623C68.0095 13.2001 67.8681 13.5263 67.8681 13.9409H64.913C64.913 13.3021 65.1107 12.7108 65.5061 12.1672C65.9014 11.6235 66.4604 11.1971 67.183 10.8879C67.9056 10.5787 68.7168 10.4241 69.6166 10.4241C70.9799 10.4241 72.0621 10.7655 72.8631 11.4485C73.664 12.1315 74.0645 13.0914 74.0645 14.3282V19.1091C74.0713 20.1556 74.2179 20.9473 74.5042 21.4842V21.6575H71.5185ZM69.0747 19.6086C69.5109 19.6086 69.9131 19.5117 70.2812 19.318C70.6493 19.1244 70.922 18.8644 71.0992 18.5382V16.6422H69.9949C68.5157 16.6422 67.7283 17.1519 67.6329 18.1713L67.6227 18.3445C67.6227 18.7115 67.7522 19.0139 68.0112 19.2518C68.2703 19.4896 68.6247 19.6086 69.0747 19.6086ZM76.163 16.0612C76.163 14.369 76.5669 13.0065 77.3747 11.9735C78.1825 10.9405 79.2714 10.4241 80.6416 10.4241C81.855 10.4241 82.7991 10.8386 83.474 11.6677L83.5967 10.6279H86.2757V21.2905C86.2757 22.2555 86.0558 23.0948 85.6161 23.8084C85.1765 24.5219 84.5579 25.0656 83.7603 25.4393C82.9627 25.8131 82.0288 26 80.9586 26C80.1474 26 79.3567 25.8386 78.5864 25.5158C77.8161 25.193 77.2332 24.7768 76.8379 24.2671L78.1467 22.473C78.8829 23.2953 79.7759 23.7064 80.8257 23.7064C81.6096 23.7064 82.2197 23.4975 82.656 23.0795C83.0922 22.6616 83.3104 22.0686 83.3104 21.3007V20.7095C82.6287 21.4774 81.7323 21.8614 80.6212 21.8614C79.2919 21.8614 78.2166 21.3432 77.3951 20.3068C76.5737 19.2705 76.163 17.896 76.163 16.1835V16.0612ZM79.1181 16.2752C79.1181 17.2742 79.3192 18.0574 79.7214 18.6249C80.1235 19.1923 80.6757 19.476 81.3778 19.476C82.2776 19.476 82.9218 19.1397 83.3104 18.4669V13.8287C82.915 13.156 82.2776 12.8196 81.3983 12.8196C80.6893 12.8196 80.1321 13.1084 79.7265 13.686C79.3209 14.2637 79.1181 15.1267 79.1181 16.2752ZM88.3742 16.0612C88.3742 14.369 88.778 13.0065 89.5858 11.9735C90.3936 10.9405 91.4826 10.4241 92.8528 10.4241C94.0662 10.4241 95.0103 10.8386 95.6851 11.6677L95.8078 10.6279H98.4868V21.2905C98.4868 22.2555 98.267 23.0948 97.8273 23.8084C97.3876 24.5219 96.769 25.0656 95.9714 25.4393C95.1739 25.8131 94.24 26 93.1697 26C92.3585 26 91.5678 25.8386 90.7975 25.5158C90.0272 25.193 89.4444 24.7768 89.049 24.2671L90.3578 22.473C91.094 23.2953 91.987 23.7064 93.0368 23.7064C93.8207 23.7064 94.4308 23.4975 94.8671 23.0795C95.3034 22.6616 95.5215 22.0686 95.5215 21.3007V20.7095C94.8399 21.4774 93.9435 21.8614 92.8323 21.8614C91.503 21.8614 90.4277 21.3432 89.6063 20.3068C88.7849 19.2705 88.3742 17.896 88.3742 16.1835V16.0612ZM91.3292 16.2752C91.3292 17.2742 91.5303 18.0574 91.9325 18.6249C92.3347 19.1923 92.8868 19.476 93.589 19.476C94.4888 19.476 95.133 19.1397 95.5215 18.4669V13.8287C95.1262 13.156 94.4888 12.8196 93.6094 12.8196C92.9005 12.8196 92.3432 13.1084 91.9376 13.686C91.532 14.2637 91.3292 15.1267 91.3292 16.2752ZM107.426 21.6575C107.29 21.3925 107.191 21.0629 107.129 20.6687C106.414 21.4638 105.483 21.8614 104.338 21.8614C103.254 21.8614 102.356 21.5488 101.644 20.9235C100.931 20.2983 100.575 19.51 100.575 18.5586C100.575 17.3897 101.01 16.4927 101.879 15.8675C102.748 15.2423 104.004 14.9263 105.647 14.9195H107.007V14.2875C107.007 13.7778 106.875 13.37 106.613 13.0642C106.351 12.7584 105.936 12.6055 105.371 12.6055C104.873 12.6055 104.483 12.7244 104.2 12.9623C103.917 13.2001 103.776 13.5263 103.776 13.9409H100.82C100.82 13.3021 101.018 12.7108 101.414 12.1672C101.809 11.6235 102.368 11.1971 103.09 10.8879C103.813 10.5787 104.624 10.4241 105.524 10.4241C106.887 10.4241 107.97 10.7655 108.771 11.4485C109.572 12.1315 109.972 13.0914 109.972 14.3282V19.1091C109.979 20.1556 110.125 20.9473 110.412 21.4842V21.6575H107.426ZM104.982 19.6086C105.418 19.6086 105.821 19.5117 106.189 19.318C106.557 19.1244 106.829 18.8644 107.007 18.5382V16.6422H105.902C104.423 16.6422 103.636 17.1519 103.54 18.1713L103.53 18.3445C103.53 18.7115 103.66 19.0139 103.919 19.2518C104.178 19.4896 104.532 19.6086 104.982 19.6086ZM122.469 16.2446C122.469 18.0116 122.091 19.3894 121.334 20.3782C120.578 21.367 119.521 21.8614 118.165 21.8614C116.965 21.8614 116.007 21.4027 115.291 20.4852L115.158 21.6575H112.5V6H115.455V11.6167C116.137 10.8216 117.033 10.4241 118.144 10.4241C119.494 10.4241 120.552 10.9184 121.319 11.9072C122.086 12.896 122.469 14.2875 122.469 16.0815V16.2446ZM119.514 16.0306C119.514 14.9161 119.337 14.1023 118.983 13.5892C118.628 13.0761 118.1 12.8196 117.398 12.8196C116.457 12.8196 115.809 13.2035 115.455 13.9715V18.3242C115.816 19.0989 116.471 19.4862 117.418 19.4862C118.373 19.4862 119 19.0173 119.3 18.0795C119.443 17.631 119.514 16.948 119.514 16.0306ZM127.666 21.6575H124.701V6H127.666V21.6575ZM135.45 21.8614C133.827 21.8614 132.507 21.3653 131.488 20.3731C130.468 19.3809 129.959 18.0591 129.959 16.4077V16.1223C129.959 15.0146 130.174 14.0241 130.603 13.1509C131.033 12.2776 131.641 11.6048 132.428 11.1325C133.216 10.6602 134.114 10.4241 135.123 10.4241C136.636 10.4241 137.827 10.8998 138.696 11.8512C139.565 12.8026 140 14.1515 140 15.8981V17.1009H132.955C133.05 17.8213 133.338 18.3989 133.819 18.8338C134.299 19.2688 134.908 19.4862 135.644 19.4862C136.782 19.4862 137.672 19.0751 138.313 18.2528L139.765 19.8736C139.322 20.4988 138.722 20.9864 137.965 21.3364C137.209 21.6864 136.37 21.8614 135.45 21.8614ZM135.112 12.8094C134.526 12.8094 134.051 13.0065 133.686 13.4006C133.321 13.7948 133.088 14.3588 132.986 15.0928H137.096V14.8583C137.082 14.2059 136.905 13.7013 136.564 13.3445C136.224 12.9878 135.74 12.8094 135.112 12.8094Z"
      fill="#8C98A1"
    />
    <defs>
      <linearGradient
        id="purple_gradient"
        x1="0"
        y1="0"
        x2="27.84"
        y2="34.56"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#99A5FF" />
        <stop offset="1" stop-color="#596DFF" />
      </linearGradient>
    </defs>
  </svg>
);

const droppable = (
  <svg
    width="69"
    viewBox="0 0 138 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M42 16.1127C42 14.3846 42.39 13.0082 43.17 11.9836C43.95 10.959 45.0169 10.4467 46.3707 10.4467C47.4566 10.4467 48.3534 10.8497 49.0612 11.6557V6H52.0507V21.7377H49.3602L49.2159 20.5594C48.4737 21.4816 47.5184 21.9426 46.3501 21.9426C45.0375 21.9426 43.9844 21.4286 43.1906 20.4006C42.3969 19.3726 42 17.9433 42 16.1127ZM44.9791 16.3279C44.9791 17.3661 45.1612 18.1619 45.5255 18.7152C45.8897 19.2684 46.4189 19.5451 47.113 19.5451C48.0338 19.5451 48.6833 19.1592 49.0612 18.3873V14.0123C48.6901 13.2404 48.0476 12.8545 47.1336 12.8545C45.6973 12.8545 44.9791 14.0123 44.9791 16.3279ZM60.8873 13.4283C60.4818 13.3736 60.1245 13.3463 59.8152 13.3463C58.6882 13.3463 57.9494 13.7254 57.5989 14.4836V21.7377H54.6198V10.6516H57.434L57.5164 11.9734C58.1143 10.9556 58.9424 10.4467 60.0008 10.4467C60.3306 10.4467 60.6399 10.4911 60.9285 10.5799L60.8873 13.4283ZM61.7452 16.0922C61.7452 14.9925 61.9583 14.0123 62.3843 13.1516C62.8104 12.291 63.4238 11.625 64.2244 11.1537C65.025 10.6824 65.9545 10.4467 67.0128 10.4467C68.5178 10.4467 69.7462 10.9044 70.698 11.8197C71.6498 12.735 72.1807 13.9781 72.2907 15.5492L72.3113 16.3074C72.3113 18.0082 71.8337 19.3726 70.8784 20.4006C69.9232 21.4286 68.6415 21.9426 67.0334 21.9426C65.4253 21.9426 64.1419 21.4303 63.1832 20.4057C62.2246 19.3811 61.7452 17.9877 61.7452 16.2254V16.0922ZM64.7243 16.3074C64.7243 17.3593 64.9236 18.1636 65.3222 18.7203C65.7208 19.277 66.2912 19.5553 67.0334 19.5553C67.755 19.5553 68.3185 19.2804 68.724 18.7305C69.1295 18.1807 69.3322 17.3012 69.3322 16.0922C69.3322 15.0608 69.1295 14.2616 68.724 13.6947C68.3185 13.1277 67.7481 12.8443 67.0128 12.8443C66.2843 12.8443 65.7208 13.126 65.3222 13.6896C64.9236 14.2531 64.7243 15.1257 64.7243 16.3074ZM84.4466 16.2971C84.4466 18.0048 84.0566 19.3726 83.2766 20.4006C82.4966 21.4286 81.4434 21.9426 80.1171 21.9426C78.99 21.9426 78.0795 21.5533 77.3854 20.7746V26H74.4062V10.6516H77.1689L77.272 11.7377C77.9936 10.877 78.935 10.4467 80.0965 10.4467C81.4709 10.4467 82.5395 10.9522 83.3024 11.9631C84.0652 12.974 84.4466 14.3675 84.4466 16.1434V16.2971ZM81.4675 16.082C81.4675 15.0505 81.2836 14.2548 80.916 13.6947C80.5483 13.1346 80.014 12.8545 79.313 12.8545C78.3784 12.8545 77.7358 13.2097 77.3854 13.9201V18.459C77.7496 19.1899 78.399 19.5553 79.3336 19.5553C80.7562 19.5553 81.4675 18.3976 81.4675 16.082ZM96.5922 16.2971C96.5922 18.0048 96.2022 19.3726 95.4222 20.4006C94.6422 21.4286 93.589 21.9426 92.2627 21.9426C91.1356 21.9426 90.2251 21.5533 89.531 20.7746V26H86.5519V10.6516H89.3145L89.4176 11.7377C90.1392 10.877 91.0807 10.4467 92.2421 10.4467C93.6165 10.4467 94.6851 10.9522 95.448 11.9631C96.2108 12.974 96.5922 14.3675 96.5922 16.1434V16.2971ZM93.6131 16.082C93.6131 15.0505 93.4293 14.2548 93.0616 13.6947C92.6939 13.1346 92.1596 12.8545 91.4586 12.8545C90.524 12.8545 89.8815 13.2097 89.531 13.9201V18.459C89.8952 19.1899 90.5446 19.5553 91.4793 19.5553C92.9018 19.5553 93.6131 18.3976 93.6131 16.082ZM105.161 21.7377C105.023 21.4713 104.924 21.14 104.862 20.7439C104.14 21.543 103.202 21.9426 102.048 21.9426C100.955 21.9426 100.05 21.6284 99.3314 21C98.6133 20.3716 98.2542 19.5792 98.2542 18.6229C98.2542 17.4481 98.6923 16.5465 99.5685 15.918C100.445 15.2896 101.711 14.972 103.367 14.9652H104.738V14.3299C104.738 13.8176 104.606 13.4078 104.341 13.1004C104.077 12.793 103.659 12.6393 103.089 12.6393C102.587 12.6393 102.194 12.7589 101.909 12.998C101.623 13.237 101.481 13.5649 101.481 13.9816H98.5016C98.5016 13.3395 98.7009 12.7452 99.0995 12.1988C99.4981 11.6523 100.062 11.2237 100.79 10.9129C101.519 10.6021 102.336 10.4467 103.243 10.4467C104.618 10.4467 105.709 10.79 106.516 11.4764C107.324 12.1629 107.728 13.1277 107.728 14.3709V19.1762C107.734 20.2281 107.882 21.0239 108.171 21.5635V21.7377H105.161ZM102.697 19.6783C103.137 19.6783 103.542 19.5809 103.913 19.3863C104.285 19.1916 104.559 18.9303 104.738 18.6025V16.6967H103.625C102.134 16.6967 101.34 17.209 101.244 18.2336L101.233 18.4078C101.233 18.7766 101.364 19.0806 101.625 19.3197C101.886 19.5587 102.244 19.6783 102.697 19.6783ZM120.327 16.2971C120.327 18.0731 119.945 19.458 119.183 20.4518C118.42 21.4457 117.355 21.9426 115.987 21.9426C114.777 21.9426 113.812 21.4816 113.09 20.5594L112.956 21.7377H110.276V6H113.255V11.6455C113.942 10.8463 114.846 10.4467 115.966 10.4467C117.327 10.4467 118.394 10.9436 119.167 11.9375C119.94 12.9314 120.327 14.3299 120.327 16.1332V16.2971ZM117.348 16.082C117.348 14.9617 117.169 14.1438 116.812 13.6281C116.454 13.1124 115.922 12.8545 115.214 12.8545C114.265 12.8545 113.613 13.2404 113.255 14.0123V18.3873C113.619 19.166 114.279 19.5553 115.234 19.5553C116.197 19.5553 116.829 19.084 117.131 18.1414C117.275 17.6906 117.348 17.0041 117.348 16.082ZM125.566 21.7377H122.576V6H125.566V21.7377ZM133.413 21.9426C131.777 21.9426 130.446 21.444 129.418 20.4467C128.391 19.4494 127.877 18.1209 127.877 16.4611V16.1742C127.877 15.0608 128.094 14.0652 128.527 13.1875C128.96 12.3098 129.573 11.6335 130.367 11.1588C131.16 10.6841 132.066 10.4467 133.083 10.4467C134.609 10.4467 135.809 10.9249 136.686 11.8811C137.562 12.8374 138 14.1933 138 15.9488V17.1578H130.898C130.994 17.8818 131.284 18.4624 131.769 18.8996C132.253 19.3368 132.866 19.5553 133.609 19.5553C134.756 19.5553 135.653 19.1421 136.299 18.3156L137.763 19.9447C137.316 20.5731 136.711 21.0632 135.949 21.415C135.186 21.7667 134.341 21.9426 133.413 21.9426ZM133.073 12.8443C132.482 12.8443 132.002 13.0423 131.635 13.4385C131.267 13.8347 131.032 14.4016 130.928 15.1393H135.072V14.9037C135.059 14.2479 134.88 13.7408 134.536 13.3822C134.193 13.0236 133.705 12.8443 133.073 12.8443Z"
      fill="#7F8C96"
      fill-opacity="0.9"
    />
    <rect
      x="-0.000488281"
      width="32"
      height="32"
      rx="5"
      fill="url(#orange_gradient)"
    />
    <rect
      x="0.499512"
      y="0.5"
      width="31"
      height="31"
      rx="4.5"
      stroke="black"
      stroke-opacity="0.06"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M21.6085 26.4478L26.4641 26.4478L26.4641 21.6013L25.0768 21.6013L25.0768 24.0841L20.7116 19.7271L19.7307 20.7061L24.0959 25.0631L21.6085 25.0631L21.6085 26.4478ZM10.3332 5.49316L5.47756 5.49318L5.47754 10.3397L6.86484 10.3397L6.86485 7.85693L11.23 12.2139L12.2109 11.2349L7.84573 6.87789L10.3331 6.87788L10.3332 5.49316ZM25.0768 10.3397L26.4641 10.3397L26.4641 5.49324L21.6085 5.49326L21.6085 6.87798L24.0959 6.87797L19.7307 11.235L20.7116 12.214L25.0768 7.857L25.0768 10.3397ZM7.84583 25.0632L12.211 20.7062L11.2301 19.7271L6.86495 24.0841L6.86496 21.6014L5.47764 21.6014L5.47762 26.4479L10.3332 26.4479L10.3332 25.0631L7.84583 25.0632Z"
      fill="#F7F8FF"
    />
    <path
      d="M26.4641 26.4478L26.4641 26.6978L26.7141 26.6978L26.7141 26.4478L26.4641 26.4478ZM21.6085 26.4478L21.3585 26.4478L21.3585 26.6978L21.6085 26.6978L21.6085 26.4478ZM26.4641 21.6013L26.7141 21.6013L26.7141 21.3513L26.4641 21.3513L26.4641 21.6013ZM25.0768 21.6013L25.0768 21.3513L24.8268 21.3513L24.8268 21.6013L25.0768 21.6013ZM25.0768 24.0841L24.9002 24.261L25.3268 24.6868L25.3268 24.0841L25.0768 24.0841ZM20.7116 19.7271L20.8882 19.5502L20.7116 19.3739L20.535 19.5502L20.7116 19.7271ZM19.7307 20.7061L19.5541 20.5292L19.3768 20.7061L19.5541 20.8831L19.7307 20.7061ZM24.0959 25.0631L24.0959 25.3131L24.7002 25.3131L24.2725 24.8862L24.0959 25.0631ZM21.6085 25.0631L21.6085 24.8131L21.3585 24.8131L21.3585 25.0631L21.6085 25.0631ZM5.47756 5.49318L5.47756 5.24318L5.22756 5.24318L5.22756 5.49318L5.47756 5.49318ZM10.3332 5.49316L10.5832 5.49316L10.5832 5.24316L10.3332 5.24316L10.3332 5.49316ZM5.47754 10.3397L5.22754 10.3397L5.22754 10.5897L5.47754 10.5897L5.47754 10.3397ZM6.86484 10.3397L6.86484 10.5897L7.11484 10.5897L7.11484 10.3397L6.86484 10.3397ZM6.86485 7.85693L7.04146 7.67998L6.61485 7.25418L6.61485 7.85692L6.86485 7.85693ZM11.23 12.2139L11.0534 12.3908L11.23 12.5671L11.4066 12.3908L11.23 12.2139ZM12.2109 11.2349L12.3875 11.4118L12.5648 11.2349L12.3875 11.0579L12.2109 11.2349ZM7.84573 6.87789L7.84573 6.62789L7.24138 6.62789L7.66912 7.05483L7.84573 6.87789ZM10.3331 6.87788L10.3332 7.12788L10.5831 7.12788L10.5831 6.87788L10.3331 6.87788ZM26.4641 10.3397L26.4641 10.5897L26.7141 10.5897L26.7141 10.3397L26.4641 10.3397ZM25.0768 10.3397L24.8268 10.3397L24.8268 10.5897L25.0768 10.5897L25.0768 10.3397ZM26.4641 5.49324L26.7141 5.49324L26.7141 5.24324L26.4641 5.24324L26.4641 5.49324ZM21.6085 5.49326L21.6085 5.24326L21.3585 5.24326L21.3585 5.49326L21.6085 5.49326ZM21.6085 6.87798L21.3585 6.87798L21.3585 7.12798L21.6085 7.12798L21.6085 6.87798ZM24.0959 6.87797L24.2725 7.05491L24.7003 6.62796L24.0959 6.62797L24.0959 6.87797ZM19.7307 11.235L19.5541 11.058L19.3768 11.235L19.5541 11.4119L19.7307 11.235ZM20.7116 12.214L20.535 12.3909L20.7116 12.5672L20.8882 12.3909L20.7116 12.214ZM25.0768 7.857L25.3268 7.857L25.3268 7.25424L24.9002 7.68005L25.0768 7.857ZM12.211 20.7062L12.3876 20.8831L12.5649 20.7062L12.3876 20.5292L12.211 20.7062ZM7.84583 25.0632L7.66922 24.8862L7.24147 25.3132L7.84583 25.3132L7.84583 25.0632ZM11.2301 19.7271L11.4067 19.5502L11.2301 19.3739L11.0535 19.5502L11.2301 19.7271ZM6.86495 24.0841L6.61495 24.0841L6.61495 24.6869L7.04156 24.2611L6.86495 24.0841ZM6.86496 21.6014L7.11496 21.6014L7.11497 21.3514L6.86496 21.3514L6.86496 21.6014ZM5.47764 21.6014L5.47764 21.3514L5.22764 21.3514L5.22764 21.6014L5.47764 21.6014ZM5.47762 26.4479L5.22762 26.4479L5.22762 26.6979L5.47762 26.6979L5.47762 26.4479ZM10.3332 26.4479L10.3332 26.6979L10.5832 26.6979L10.5832 26.4479L10.3332 26.4479ZM10.3332 25.0631L10.5832 25.0631L10.5832 24.8131L10.3332 24.8131L10.3332 25.0631ZM26.4641 26.1978L21.6085 26.1978L21.6085 26.6978L26.4641 26.6978L26.4641 26.1978ZM26.2141 21.6013L26.2141 26.4478L26.7141 26.4478L26.7141 21.6013L26.2141 21.6013ZM25.0768 21.8513L26.4641 21.8513L26.4641 21.3513L25.0768 21.3513L25.0768 21.8513ZM25.3268 24.0841L25.3268 21.6013L24.8268 21.6013L24.8268 24.0841L25.3268 24.0841ZM20.535 19.904L24.9002 24.261L25.2534 23.9071L20.8882 19.5502L20.535 19.904ZM19.9073 20.8831L20.8882 19.904L20.535 19.5502L19.5541 20.5292L19.9073 20.8831ZM24.2725 24.8862L19.9073 20.5292L19.5541 20.8831L23.9193 25.24L24.2725 24.8862ZM21.6085 25.3131L24.0959 25.3131L24.0959 24.8131L21.6085 24.8131L21.6085 25.3131ZM21.8585 26.4478L21.8585 25.0631L21.3585 25.0631L21.3585 26.4478L21.8585 26.4478ZM5.47756 5.74318L10.3332 5.74316L10.3332 5.24316L5.47756 5.24318L5.47756 5.74318ZM5.72754 10.3397L5.72756 5.49318L5.22756 5.49318L5.22754 10.3397L5.72754 10.3397ZM6.86484 10.0897L5.47754 10.0897L5.47754 10.5897L6.86484 10.5897L6.86484 10.0897ZM6.61485 7.85692L6.61484 10.3397L7.11484 10.3397L7.11485 7.85693L6.61485 7.85692ZM11.4066 12.0369L7.04146 7.67998L6.68824 8.03387L11.0534 12.3908L11.4066 12.0369ZM12.0343 11.0579L11.0534 12.0369L11.4066 12.3908L12.3875 11.4118L12.0343 11.0579ZM7.66912 7.05483L12.0343 11.4118L12.3875 11.0579L8.02234 6.70095L7.66912 7.05483ZM10.3331 6.62788L7.84573 6.62789L7.84573 7.12789L10.3332 7.12788L10.3331 6.62788ZM10.0832 5.49316L10.0831 6.87788L10.5831 6.87788L10.5832 5.49316L10.0832 5.49316ZM26.4641 10.0897L25.0768 10.0897L25.0768 10.5897L26.4641 10.5897L26.4641 10.0897ZM26.2141 5.49324L26.2141 10.3397L26.7141 10.3397L26.7141 5.49324L26.2141 5.49324ZM21.6085 5.74326L26.4641 5.74324L26.4641 5.24324L21.6085 5.24326L21.6085 5.74326ZM21.8585 6.87798L21.8585 5.49326L21.3585 5.49326L21.3585 6.87798L21.8585 6.87798ZM24.0959 6.62797L21.6085 6.62798L21.6085 7.12798L24.0959 7.12797L24.0959 6.62797ZM19.9073 11.4119L24.2725 7.05491L23.9193 6.70102L19.5541 11.058L19.9073 11.4119ZM20.8882 12.0371L19.9073 11.058L19.5541 11.4119L20.535 12.3909L20.8882 12.0371ZM24.9002 7.68005L20.535 12.0371L20.8882 12.3909L25.2534 8.03394L24.9002 7.68005ZM25.3268 10.3397L25.3268 7.857L24.8268 7.857L24.8268 10.3397L25.3268 10.3397ZM12.0344 20.5292L7.66922 24.8862L8.02244 25.2401L12.3876 20.8831L12.0344 20.5292ZM11.0535 19.9041L12.0344 20.8831L12.3876 20.5292L11.4067 19.5502L11.0535 19.9041ZM7.04156 24.2611L11.4067 19.9041L11.0535 19.5502L6.68834 23.9072L7.04156 24.2611ZM6.61496 21.6014L6.61495 24.0841L7.11495 24.0841L7.11496 21.6014L6.61496 21.6014ZM5.47764 21.8514L6.86497 21.8514L6.86496 21.3514L5.47764 21.3514L5.47764 21.8514ZM5.72762 26.4479L5.72764 21.6014L5.22764 21.6014L5.22762 26.4479L5.72762 26.4479ZM10.3332 26.1979L5.47762 26.1979L5.47762 26.6979L10.3332 26.6979L10.3332 26.1979ZM10.0832 25.0631L10.0832 26.4479L10.5832 26.4479L10.5832 25.0631L10.0832 25.0631ZM7.84583 25.3132L10.3332 25.3131L10.3332 24.8131L7.84583 24.8132L7.84583 25.3132Z"
      fill="white"
    />
    <defs>
      <linearGradient
        id="orange_gradient"
        x1="5.49951"
        y1="6"
        x2="44.6266"
        y2="51.1073"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#FFDA59" />
        <stop offset="0.980743" stop-color="#DC9C1F" />
      </linearGradient>
    </defs>
  </svg>
);