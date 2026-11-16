import React from 'react';
import { Text, View } from 'react-native';
import { ENV } from '../src/shared/config/env';
export function DemoNotice() {
  if (ENV.SNACK_HTTP_WEB) {
    return <View style={{backgroundColor:'#161111',padding:6}}><Text style={{color:'#F7F5F3',fontSize:11,textAlign:'center'}}>Sessão temporária • use uma conta de teste • sair encerra a sessão neste preview</Text></View>;
  }
  return <View style={{backgroundColor:'#161111',padding:6}}><Text style={{color:'#F7F5F3',fontSize:11,textAlign:'center'}}>DEMONSTRAÇÃO • dados fictícios nesta sessão • dono@demo.test / barbeiro@demo.test / cliente@demo.test • senha: Demo123!</Text></View>;
}
