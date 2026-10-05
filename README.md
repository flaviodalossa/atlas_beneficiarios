# Atlas dos beneficiários · Brasil

Mapa interativo de beneficiários de planos de saúde por município, pronto para GitHub Pages. HTML, CSS e JavaScript com Leaflet. Não precisa de instalação, compilação, servidor de aplicação ou chaves de acesso.

## Publicar pelo site do GitHub

1. Crie um repositório público, por exemplo `atlas-beneficiarios`.
2. Extraia o arquivo `atlas_beneficiarios_github.zip` no seu computador.
3. No repositório, clique em **Add file → Upload files**.
4. Envie **o conteúdo extraído**, incluindo as pastas `data/` e `vendor/`, e salve as alterações na branch `main` (ou na branch principal do seu repositório).
5. Confira que `index.html` aparece diretamente na raiz do repositório. Não envie apenas o ZIP, nem coloque todos os arquivos dentro de uma pasta adicional.
6. Abra **Settings → Pages**. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
7. Selecione a branch principal (`main`, normalmente), a pasta **/ (root)** e clique em **Save**.
8. Aguarde a publicação. O endereço do site aparecerá nessa mesma página, normalmente `https://SEU_USUARIO.github.io/atlas-beneficiarios/`.

Os arquivos estão abaixo do limite de tamanho para envio pelo navegador. Preserve a organização das pastas. O arquivo `.nojekyll` indica que a aplicação já está pronta para publicação como arquivos estáticos.

Referências: [envio de arquivos](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository) e [configuração do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Estrutura do repositório

```text
index.html
app.js
styles.css
.nojekyll
README.md
data/
  indicadores.json
  metadados.json
  municipios.geojson
vendor/
  leaflet.js
  leaflet.css
  LEAFLET-LICENSE
```

Os endereços dos recursos são relativos, compatíveis com sites de projeto do GitHub Pages. Nenhum endereço `localhost` é usado pela aplicação publicada. As bibliotecas e geometrias estão incluídas; não há consultas externas para carregar o mapa.

## Como usar

O segundo gráfico, **Categorias de preço identificadas**, mostra as seis categorias divididas apenas pelo total de beneficiários com preço identificado no município e no recorte selecionado. Exibe o tamanho dessa base; sem preços identificados, informa a ausência de dados. O primeiro gráfico continua usando o total municipal, incluindo preços não identificados.

- Ao abrir, o mapa exclui os planos exclusivamente odontológicos. Marque **Incluir planos exclusivamente odontológicos** para exibir todos os planos.
- A opção atualiza o total nacional e municipal, as cores e a legenda, os percentuais, a oferta e o ranking das seis maiores operadoras.
- Passe o mouse sobre um município para atualizar o painel.
- Clique ou toque para fixar a seleção; use **Liberar seleção** para voltar a explorar.
- Pesquise pelo nome do município/UF ou pelo código IBGE.
- A escala vai do azul ao vermelho conforme a quantidade de beneficiários. A legenda permite alternar entre escala logarítmica e linear.
- O painel mostra total e participação nacional, distribuições por preço, idade e contratação, planos ofertados e as seis maiores operadoras.
- **Faixas de preço vigentes:** classifica a mensalidade comercial usando os limites do arquivo `faixa_preco_vigor.csv`, específicos de idade e contratação. Apenas registros com `DT_FIM_VALIDADE` vazia/NA são usados. As barras mostram quantidade e percentual do total municipal, incluindo preços não identificados e preços sem faixa correspondente.
- **Proporções das categorias de preço:** usa as seis categorias dos quantis nacionais, com denominador formado exclusivamente pelos beneficiários com preço identificado no município e recorte. Quando esse total é zero, informa ausência de dados.
- No celular, os indicadores aparecem abaixo do mapa.
- **Fontes e metodologia** apresenta os quantis em reais e os critérios de cálculo.

## Referência dos dados

Competência dos beneficiários: **maio de 2026**. O recorte padrão contém **53.467.632 vínculos ativos**, excluindo **36.112.076** vínculos de planos exclusivamente odontológicos. A opção de incluir todos mostra **89.579.708** vínculos. Vínculos não equivalem a pessoas únicas.

A exclusão usa `GR_SGMT_ASSISTENCIAL = Exclusivamente Odontológico`; planos médicos que incluem cobertura odontológica permanecem. **3.517.367 vínculos sem classificação de cobertura** são mantidos em ambos os recortes e indicados na interface. Portanto, o padrão reúne os confirmados como não exclusivamente odontológicos e os desconhecidos.

Os preços usam a mensalidade comercial da base nacional de produtos do projeto, com quantis Q20, Q40, Q60, Q80 e Q95 por faixa etária, sem ponderação por beneficiários. Os quantis são iguais nos dois recortes porque a fonte já não contém planos exclusivamente odontológicos. Há **32.321.927 vínculos sem preço classificável no padrão** (60,5%) e **68.434.003 na visão completa** (76,4%), preservados como **Preço não identificado**. A idade é aproximada pelo ano de nascimento.

A malha municipal simplificada do IBGE tem referência **2022**. **3.690 vínculos no padrão**, ou **6.216 na visão completa**, não têm município compatível com essa malha, mas integram o denominador nacional do respectivo recorte.

A oferta conta registros de planos distintos com cadastro ativo e município na área de comercialização NTRP. As operadoras são agrupadas pelo registro ANS.

As faixas de preço do CSV são uma classificação diferente das categorias dos quantis. Em cada faixa do CSV, o limite inferior é exclusivo e o superior inclusivo; o valor exatamente no corte fica na faixa que termina nesse corte. Os limites vigentes do arquivo são aplicados à competência dos beneficiários, sem usar faixas encerradas. A tabela completa de limites e datas pode ser consultada em **Fontes e metodologia**.

Este pacote contém somente a aplicação e os resumos agregados necessários à visualização. Os parquets analíticos e o código de processamento foram preservados separadamente no projeto de análise.

## Atualizar

Substitua os arquivos da aplicação ou os resumos em `data/` por uma nova versão e salve as alterações na branch configurada. O GitHub Pages fará uma nova publicação.

## Testar no computador (opcional)

Na pasta extraída, com Python disponível:

```shell
python -m http.server 8765
```

Abra `http://127.0.0.1:8765`. O servidor local serve apenas para testes; os visitantes do GitHub Pages não precisam dele.
