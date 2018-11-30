import * as React from 'react';
import styled from 'styled-components';

import { colors } from 'ts/style/colors';

interface Props {
    size?: 'normal' | 'medium' | 'large';
    muted?: any;
    center?: boolean;
}

export const Heading: React.StatelessComponent<Props> = ({ children, ...props }) => (
    <StyledHeading {...props}>{children}</StyledHeading>
);

export const Intro: React.StatelessComponent<Props> = ({ children, ...props }) => (
    <StyledIntro {...props}>{children}</StyledIntro>
);

export const Text: React.StatelessComponent<Props> = ({ children, ...props }) => (
    <StyledText {...props}>{children}</StyledText>
);

Heading.defaultProps = {
    size: 'normal',
    center: false,
};

Intro.defaultProps = {
    size: 'normal',
    center: false,
};

Text.defaultProps = {
    size: 'normal',
    center: false,
};

const StyledHeading = styled.h1`
    color: ${colors.white};
    font-size: 1.111111111rem;
    line-height: 1.4em;

    ${(props: Props) => props.center && `
        text-align: center
    `}

    ${(props: Props) => props.size === 'medium' && `
        font-size: 3.222222222rem; // 50px
        line-height: 1.16em;
    `}

    ${(props: Props) => props.size === 'large' && `
        font-size: 4.444444444rem; // 80px
        line-height: 1em;
    `}
`;

const StyledIntro = styled.p`
    color: ${colors.white};
    opacity: 0.75;
    font-size: 22px;
    line-height: 1.823529412em;

    ${(props: Props) => props.center && `
        text-align: center
    `}
`;

const StyledText = styled.p<Props>`
    color: ${colors.white};
    font-size: 1rem;
    ${(props: Props) => props.size === 'medium' && `
        font-size: 1.555555556rem;
        line-height: 1.357142857em;
    `}
    ${(props: Props) => props.center && `
        text-align: center
    `}

    ${(props: Props) => props.muted && `
        opacity: ${typeof props.muted === 'string' ? props.muted : '0.8'};
    `}
`;
