import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(){
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET não definido nas variáveis de ambiente');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET,
        });
    }

    async validate(payload: any){
        return{
            userId: payload.sub,
            email: payload.email,
        };
    }
}