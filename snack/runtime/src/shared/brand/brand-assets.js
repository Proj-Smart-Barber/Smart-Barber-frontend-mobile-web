export const brand = {
    logo: {
        full: {
            dark: ({ uri: "https://raw.githubusercontent.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/99da9f8/assets/images/logos/01_principal_crimson_sobre_obsidian.png" }),
            inverse: ({ uri: "https://raw.githubusercontent.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/99da9f8/assets/images/logos/02_ivory_sobre_obsidian.png" }),
            light: ({ uri: "https://raw.githubusercontent.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/99da9f8/assets/images/logos/03_obsidian_sobre_ivory.png" }),
            onCrimson: ({ uri: "https://raw.githubusercontent.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/99da9f8/assets/images/logos/04_ivory_sobre_crimson.png" }),
        },
        monochromeDark: ({ uri: "https://raw.githubusercontent.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/99da9f8/assets/images/logos/08_monocromatico_preto_sobre_branco.png" }),
        monochromeLight: ({ uri: "https://raw.githubusercontent.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/99da9f8/assets/images/logos/09_monocromatico_branco_sobre_preto.png" }),
    },
    icon: {
        default: ({ uri: "https://raw.githubusercontent.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/99da9f8/assets/images/logos/05_app_icon_obsidian_crimson.png" }),
        onCrimson: ({ uri: "https://raw.githubusercontent.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/99da9f8/assets/images/logos/06_app_icon_crimson_ivory.png" }),
        light: ({ uri: "https://raw.githubusercontent.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/99da9f8/assets/images/logos/07_app_icon_ivory_obsidian.png" }),
    },
    symbol: {
        crimson: ({ uri: "https://raw.githubusercontent.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/99da9f8/assets/images/logos/10_simbolo_crimson_transparente.png" }),
        obsidian: ({ uri: "https://raw.githubusercontent.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/99da9f8/assets/images/logos/11_simbolo_obsidian_transparente.png" }),
        ivory: ({ uri: "https://raw.githubusercontent.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/99da9f8/assets/images/logos/12_simbolo_ivory_transparente.png" }),
    },
};
export function getBrandSource(variant) {
    const variants = {
        'symbol-crimson': brand.symbol.crimson,
        'symbol-obsidian': brand.symbol.obsidian,
        'symbol-ivory': brand.symbol.ivory,
        'full-dark': brand.logo.full.dark,
        'full-inverse': brand.logo.full.inverse,
        'full-light': brand.logo.full.light,
        'full-on-crimson': brand.logo.full.onCrimson,
        'icon-default': brand.icon.default,
        'icon-light': brand.icon.light,
    };
    return variants[variant];
}
