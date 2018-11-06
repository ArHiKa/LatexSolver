/* global HTMLElement, MathJax */

function init(){
    LatexSolver = new LatexSolver('gegevens', 'input', 'output', true);
}

const ELEMENTS = {
    DIV:'div',
    TEXTAREA:'textarea',
    PARAGRAPH:'p',
    SPAN:'span'
};

const TEXTELEMENTS = {
    /**
     * 
     * @type String ''
     */
    EMPTY:'',
    /**
     * 
     * @type String '_'
     */
    UNDERSCORE:'_',
    NONBREAKINGSPACE:'&nbsp;',
    BRACKET_BLOCK_OPEN: '[',
    BRACKET_BLOCK_CLOSE: ']',
    SEMICOLON: ';',
    SPACE: ' '
};
const REGEX = {
    /**
     * 
     * @type String |
     */
    OR:'|',
    
    /**
     * 
     * @type String g
     */
    GLOBAL:'g',
    
    
    NUMBER:'[-]{0,1}[0-9]{0,}[\\.]{0,1}[0-9]{0,}',
    EXPONENT:'([eE][+-]{0,1}[0-9]{1,}){0,1}',
    get NUMBER_AND_EXPONENT(){return this.NUMBER + this.EXPONENT;},
    NUMBER_MAG:'[0-9]{0,}[\\.]{0,1}[0-9]{0,}(\\*10\\^[-]{0,1}[0-9]{1,}){0,1}',
    QUANTITY: '[a-zA-Zα-ωΑ-Ω]{1,}[a-zA-Zα-ωΑ-Ω0-9]{0,}(\\_[a-zA-Zα-ωΑ-Ω0-9]{1,}){0,1}',
    MATH_TEXT: '[\\+\\-\\*\\/\\^\\=\\(\\)]',
    SIN: 'sin',
    ASIN: 'asin',
    COS: 'cos',
    ACOS: 'acos',
    TAN: 'tan',
    ATAN: 'atan',
    SQRT: 'sqrt',
    LOG: 'log',
    LN: 'ln',
    PI:'pi',
    
    
    /**
     * 
     * @param {[StringRegularExpression]} list Array of strings which contains regular expersions to be parsed in to a regular expression
     * @param {String} flags defauilt: '' 
     * @param {Boolean} andOr default: false, combines all the regular expressions <br> true if you want a '|' seperator between the expressions
     * @returns {RegExp}
     */
    COMBINED:function(list, flags = '', andOr = false){
        let regex = '';
        
        for(let i = 0; i<list.length; i++){
            regex += list[i];
            if(andOr && i < list.length - 1){
                regex += REGEX.OR;
            }//end of
        }// end for i
        
        return new RegExp(regex, flags);
    },
    
    get CONSTANTS(){
        return this.COMBINED([this.PI], '', true);
    },
    
    get MATH_FUNCTIONS(){
        return this.COMBINED([
                                this.SIN, 
                                this.ASIN, 
                                this.COS, 
                                this.ACOS, 
                                this.TAN,
                                this.ATAN,
                                this.SQRT,
                                this.LN,
                                this.LOG
                            ], '', true);
    },
    
    get QUANTITY_SYMBOLS(){
        return this.COMBINED([this.QUANTITY], REGEX.GLOBAL);
    },
    
    get EQUATION(){
        return this.COMBINED([this.QUANTITY, this.NUMBER_AND_EXPONENT], REGEX.GLOBAL, true);
    },
    
    get EQUATION_SYMBOLS_ALL(){
        return this.COMBINED([this.QUANTITY, , this.MATH_TEXT, this.NUMBER_AND_EXPONENT], REGEX.GLOBAL, true);
    },
    
    get NUMBER_OR_EXPONENT(){
        return this.COMBINED([this.NUMBER, this.EXPONENT], '', false);
    }
};

const ASCIIMATH = {
    TEX: '`',
    GROUP_OPEN:'{:',
    GROUP_CLOSE:':}',
    SUB:'_',
    EQUALS: '`=`',
    PLUSMINUS: '+-',
    DASH: '-',
    BRACKETS_BLOCK_OPEN: '\{',
    BRACKETS_BLOCK_CLOSE: '\]'
};


function LatexSolver(givenTextareaId, inputTextareaId, outputDivId, usePrecicion = false){
    let testing = true;
    let givenText = document.getElementById(givenTextareaId);
    let inputText = document.getElementById(inputTextareaId);
    let outputDiv = document.getElementById(outputDivId);
    let showPrecicion = usePrecicion;
    let data = [];
    
    
    
    let Datapoint = function(){
        
        this.element = function(){
            return document.getElementById(this.quantity.text);
        };
        this.referenceElements = function(){
            let elements = [];
            let syms = this.equation.quantitySymbols;
            
            
            for(let i = 0; i < syms.length; i++){
                if(syms[i].match(REGEX.MATH_FUNCTIONS) || syms[i].match(REGEX.CONSTANTS)){
                    continue;
                }
                let element = {
                    from:undefined,
                    to:HTMLElement,
                    
                    get x(){
                        return this.from.getBoundingClientRect().x;
                    },
                    
                    get y(){
                        return this.from.getBoundingClientRect().y;
                    }
                };
                let symbol = syms[i];
                
                element.to = document.getElementById(symbol);
                
                elements.push(element);
            }
            return elements;
        },
                
        this.quantity = {
            text:TEXTELEMENTS.EMPTY,
            base:TEXTELEMENTS.EMPTY,
            sub:TEXTELEMENTS.EMPTY,
            
            set value(text){
                this.text = text;
                if(text.includes(TEXTELEMENTS.UNDERSCORE)){
                    base_sub = text.split(TEXTELEMENTS.UNDERSCORE);
                    this.base = toGreekLetter(base_sub[0]);
                    this.sub = toGreekLetter(base_sub[1]);
                } else {
                    this.base = toGreekLetter(text);
                }
            },
            
            get printText(){
                let text = this.base;
                if(this.sub.length > 0){
                    text += TEXTELEMENTS.UNDERSCORE + this.sub;
                }
                return  text;
            },
            
            get printLatex(){
                let tex = ASCIIMATH.GROUP_OPEN + this.base;
                if(this.sub.length > 0){
                    tex+= ASCIIMATH.SUB + ASCIIMATH.GROUP_OPEN + this.sub + ASCIIMATH.GROUP_CLOSE;
                }
                tex += ASCIIMATH.GROUP_CLOSE;
                return ASCIIMATH.TEX + tex + ASCIIMATH.TEX; 
            }
        };
        
        this.equation = {
            text:TEXTELEMENTS.EMPTY,
            
            
            set value(text){
                this.text = text;
                let syms = this.text.match(REGEX.QUANTITY_SYMBOLS);
                
                //filter all empty indices
                syms = syms.filter(filterEmptyStringFromArray);
                
                
            },
            
            get quantitySymbols(){
                let syms = this.text.match(REGEX.QUANTITY_SYMBOLS);
                
                //filter all empty indices
                syms = syms.filter(filterEmptyStringFromArray);
                return syms;
            },
            
            get separated(){
                let sep =  this.text.match(REGEX.EQUATION_SYMBOLS_ALL);
                
                //filter empty array indices
                sep = sep.filter(filterEmptyStringFromArray);
                return sep;
            },
            
            get printText(){
                return this.text;
            },
            
            get printLatex(){
                let tex = TEXTELEMENTS.EMPTY;
                let sep = this.separated;
                for(let i = 0; i < sep.length; i++){
                    let symbol = sep[i];
                    
                    if(isNaN(symbol) === false){
                        symbol = exponentToMagnitude(symbol);
                        symbol = group(symbol);
                        sep[i] = symbol;
                    }
                    
                    if(symbol.match(REGEX.MATH_FUNCTIONS)){
                        continue;
                    }
                    
                    if(symbol.match(REGEX.QUANTITY_SYMBOLS)){
                        if(symbol.includes(TEXTELEMENTS.UNDERSCORE)){
                            let symBase = symbol.split(TEXTELEMENTS.UNDERSCORE)[0];
                            let symSub = symbol.split(TEXTELEMENTS.UNDERSCORE)[1];
                            
                            symBase = group(symBase);
                            symSub = group(symSub);
                            
                            symbol = symBase + TEXTELEMENTS.UNDERSCORE + symSub;
                            symbol = group(symbol);
                            sep[i] = symbol;
                        } else {
                            symbol = group(symbol);
                            symbol = symbol + TEXTELEMENTS.UNDERSCORE + group(TEXTELEMENTS.EMPTY);
                            symbol = group(symbol);
                            sep[i] = symbol;
                        }
                    }
                }
                
                tex = ASCIIMATH.TEX + ASCIIMATH.GROUP_OPEN + sep.join('') + ASCIIMATH.GROUP_CLOSE + ASCIIMATH.TEX;
                function group(text){
                    return ASCIIMATH.GROUP_OPEN + text + ASCIIMATH.GROUP_CLOSE;
                }
                return tex;
            }
        };
        this.answer = {
            range:[],
            numberRange:[],
            significant:[],
            magnitude:[],
            unit:'',
            
            set addRange(range){
                if(range.includes(TEXTELEMENTS.BRACKET_BLOCK_OPEN) && range.includes(TEXTELEMENTS.BRACKET_BLOCK_CLOSE)){
                    range = range.substring(1, range.length-1);
                    range = range.split(TEXTELEMENTS.SEMICOLON);
                    this.range = range;
                } else {
                    this.range.push(range);
                }
                
                this.range.sort(sortByStringNumber);
                if(this.equation === undefined){
                    this.setSignificanceAndMagnitude();
                }
                
            },
            
            get value(){                
                let num1 = Number(this.range[0]);
                let num2 = Number(this.range[this.range.length - 1]);
                let val = (num1 + num2)/2;
                let sign1 = this.significant[0];
                let sign2 = this.significant[this.significant.length - 1];
                let sig = Math.min(sign1, sign2);
                if(val !== 0){
                    val = val.toExponential(sig - 1);
                } else {
                    val = val.toString();
                }
                
                return val;
            },
            
            get printText(){
                let text = TEXTELEMENTS.EMPTY;
                    
                
                if(this.range.length === 1){
                    text = this.range[0]; 
                } else {
                    text = TEXTELEMENTS.BRACKET_BLOCK_OPEN + this.range[0] + TEXTELEMENTS.SEMICOLON + TEXTELEMENTS.SPACE + this.range[this.range.length-1] + TEXTELEMENTS.BRACKET_BLOCK_CLOSE;
                }
                text +=  TEXTELEMENTS.SPACE + this.unit;
                return text;
            },
            
            get printLatex(){
                let tex = TEXTELEMENTS.EMPTY;
                if(usePrecicion){
                    if(this.range.length === 1){
                        let val = Number(this.range[0]);
                        let sig = this.significant[0];
                        if(val !== 0 && sig > 0){
                            val = val.toExponential(sig - 1);
                        }
                        
                        tex += exponentToMagnitude(val); 
                    } else {
                        let val1 = Number(this.range[0]);
                        let val2 = Number(this.range[this.range.length-1]);
                        let val = (val1 + val2)/2;
                        let diff = Math.abs(val1 - val2)/2;
                        let sign = this.significant[0];                        
                       
                        val = val.toExponential(sign - 1);
                        diff = toMagnitude(diff, val);
                        tex += ASCIIMATH.GROUP_OPEN + exponentToMagnitude(val) + ASCIIMATH.PLUSMINUS + exponentToMagnitude(diff)+ ASCIIMATH.GROUP_CLOSE;
                    }
                    
                } else {
                    if(this.range.length === 1){
                        tex += exponentToMagnitude(this.range[0]); 
                    } else {
                        tex += ASCIIMATH.BRACKETS_BLOCK_OPEN + exponentToMagnitude(this.range[0]) + ASCIIMATH.DASH + exponentToMagnitude(this.range[this.range.length-1])+ ASCIIMATH.BRACKETS_BLOCK_CLOSE;
                    }
                    
                }
                
                if(this.unit === undefined){
                    this.unit = TEXTELEMENTS.EMPTY;
                }
                tex += ASCIIMATH.GROUP_OPEN + TEXTELEMENTS.NONBREAKINGSPACE + this.unit + ASCIIMATH.GROUP_CLOSE;
                return ASCIIMATH.TEX + tex + ASCIIMATH.TEX;
            },
                        
            setSignificanceAndMagnitude: function(){
                this.significant = [];
                for(let i = 0; i < this.range.length; i++){
                    let number = this.range[i];
                    number = number.replace(/^[-]{0,1}/,'');
                    let mag = number;
                    
                    number = number.replace(/\./g, '');
                    number = number.replace(/[eE][+-]{0,1}[0-9.]{0,}/g, '');
                    while(number[0] === '0'){
                        number = number.substring(1,number.length);
                    }
                    
                    mag = Number(mag).toExponential();
                    mag = mag.replace(/^[0-9\.]{1,}[e][+]{0,1}/, '');
                    this.significant[i] = number.length;
                    this.magnitude[i] = mag;
                }
            },
            
            calculationText:TEXTELEMENTS.EMPTY,
            
            set calculation(text){
                this.calculationText = text;
                
                let ans = calculate(text);
                this.range = ans.answer.range;
                this.significant = ans.answer.significant;
                this.magnitude = ans.answer.magnitude;
            },
            
            get calculationPrintText(){
                return this.calculationText;
            },
            
            get calculationPrintLatex(){
                let tex = TEXTELEMENTS.EMPTY;
                let sep = separate(this.calculationText);
                for(let i = 0; i < sep.length; i++){
                    let symbol = sep[i];
                    
                    if(symbol.match(/[\+\-\/\*\^\(\)]/)){
                        if(symbol === '^'){
                            let prev = sep[i-1];
                            if(prev.includes('*10^')){
                                prev = prev.replace('{:', '{:(');
                                prev = prev.replace(':}', '):}');
                                sep[i-1] = prev;
                            }
                        }
                        
                        
                        
                        continue;
                    }
                    
                    
                    for(let j = 0; j < data.length; j++){
                        let dp = Datapoint;
                        dp = data[j];
                        if(symbol === dp.quantity.text){
                            
                            if(dp.answer.value[0] === '-'){
                                sep[i] = ASCIIMATH.GROUP_OPEN +'('+ exponentToMagnitude(dp.answer.value) + ')' + ASCIIMATH.GROUP_CLOSE;
                            } else {
                                sep[i] = ASCIIMATH.GROUP_OPEN + exponentToMagnitude(dp.answer.value) + ASCIIMATH.GROUP_CLOSE;
                            }
                            
                            
                            break;
                        }
                        
                        
                        
                    }
                }
                
                               

                
                tex = sep.join('');
                return ASCIIMATH.TEX + tex + ASCIIMATH.TEX;
            }
            
        };
        //metadata,
        this.isFinal = false;
        this.isInfinite = false;
    };
    
    this.run = function(){
        data = [];
        try{
            this.compileGivenText();
            this.compileInputText();
            this.loadGiven();
            this.loadInput();
            this.print();
        } catch (e){
            alert(e.message);
        }
        
        
        if(testing){
            test();
        }
        
    };
    
    
    this.compileGivenText = function(){
        let illegalTextElements = [
            {code:1, illigal:/[^a-zA-Zα-ωΑ-Ω0-9\,\.\=\_\;\[\]\s\#\'\/\-]/g, message:'Alleen volgende karakters zijn toegestaan:\na-z, A-Z, α-ω, Α-Ω, 0-9, \npunt(.), komma(,)\nVoor bereiken: blokhaak open([) ,puntkomma (;), blokhaak sluiten (])\nVoor constanten: hekje(#)\napostrof(\') voor een eenheid'},
            {code:2, illigal:/=.{0,}=/,   message:'Er is maar één is-teken(=) toegestaan.\n Syntax: grootheid = waarde \'eenheid'},
            {code:3, illigal:/\'.{0,}\'/, message:'Er is maar één apostrof (\') toegestaan'},
            {code:4, illigal:/\[.{0,}\[/,   message:'Er is maar één blokhaak-open (\[) toegestaan\nSyntax: [waarde1; waarde2]'},
            {code:5, illigal:/\].{0,}\]/,   message:'Er is maar één blokhaak-sliot (\]) toegestaan\nSyntax: [waarde1; waarde2]'},
            {code:6, illigal:/[;].{0,}[;]/, message:'Er is maar één punt-komma (;) toegestaan\nSyntax: [waarde1; waarde2]'},
            {code:7, illigal:/[\,\.].{0,}[\,\.]/,   message:'Er is maar één punt of komma (. of ,) toegestaan\nSyntax: [waarde1; waarde2]'},
            {code:8, illigal:/_.{0,}_/,   message:'Er is maar één underscore (_) toegestaan\nSyntax: grootheid_sub'}
        ];
        
        

        let lines = givenText.value.split('\n');
        
        
        for(let i = 0; i < lines.length; i++){
            let line = lines[i];
            checkForIlligal(line, i+1);
        }
        
        function checkForIlligal(line, lineNumber){
            let completeSyntax = /[#]{0,1}[a-zA-Zα-ωΑ-Ω]{1,}[0-9]{0,}(_[a-zA-Zα-ωΑ-Ω0-9]{1,}){0,1}\s{0,}=\s{0,}\[([0-9]{0,}([\.\,]{0,}[0-9]{0,}){0,1}([E][-]{0,1}[0-9]{1,}){0,1}\s{0,});([0-9]{0,}([\.\,]{0,}[0-9]{0,}){0,1}([E][-]{0,1}[0-9]{1,}){0,1}\s{0,})]\s{0,}('.{0,}){0,1}|[#]{0,1}[a-zA-Zα-ωΑ-Ω]{1,}[0-9]{0,}(_[a-zA-Zα-ωΑ-Ω0-9]{1,}){0,1}\s{0,}=\s{0,}[0-9]{0,}([\.\,]{0,}[0-9]{0,}){0,1}([E][-]{0,1}[0-9]{1,}){0,1}\s{0,}('.{0,}){0,1}/;
            for(let i = 0; i < illegalTextElements.length; i++){
                let illegalTextElement = illegalTextElements[i];
                let match = line.match(illegalTextElement.illigal);
                if(match){
                    throw errormessage(line, match, lineNumber, illegalTextElement);
                }
                
                if(line !== line.match(completeSyntax)[0]){
                    let match = line.match(completeSyntax)[0];
                    let wrongSyntax = {
                        code:'Wrong Syntax ' + new Error().lineNumber, 
                        message:'Verkeerde syntax.\nNodig:\nGrootheid(_sub) = getal(E(-)integer) (\'eenhheid)'};

                    throw errormessage(line, line.replace(match, ''), lineNumber, wrongSyntax);
                }
                    
            }
        }
        
        function errormessage(totalInput, illigalInput, lineNumber, illegalTextElement){
            let text = 'Gegevens: \n';
            text += 'Fout in regel #' + lineNumber + ': '+totalInput+'\n';
            text += 'Fout: '+ illigalInput + '\n';
            text += illegalTextElement.message + '\n';
            text += '(foutmelding: ' + illegalTextElement.code + ')';
            return new Error(text);
        }
    };
    
    this.compileInputText = function(){
        
    };
    
    this.loadGiven = function(){
        let lines = givenText.value.split('\n');
        
        

        for(let i = 0; i < lines.length; i++){
            if(lines[i].length === 0){
                continue;
            }
            let given = lines[i].replace(/ /g, '');// remove al white sopaces
            given = given.replace(/\,/, '.');
            let datapoint = new Datapoint();// net data instance
            
            let q_rangeUnit = given.split('=');// split line on =
            let quantity = q_rangeUnit[0];
            if(quantity[0] === '#'){
                datapoint.isInfinite = true;
                quantity = quantity.substring(1, quantity.length);
            } else {
                delete datapoint.isInfinite;
            }
            
            let range_unit = q_rangeUnit[1].split('\'');
            let range = range_unit[0];
            let unit = range_unit[1];
            
            
            
            datapoint.quantity.value = quantity;
            datapoint.answer.addRange = range;
            datapoint.answer.unit = unit;
            delete datapoint.equation;
            delete datapoint.answer.calculation;
            delete datapoint.answer.calculationPrintLatex;
            delete datapoint.answer.calculationPrintText;
            delete datapoint.answer.calculationText;
            delete datapoint.isFinal;
            
            data.push(datapoint);
        }// end for i in lines 
    };
    
    this.loadInput = function(){
        let lines = inputText.value.split('\n');
        
        for(let i = lines.length - 1; i > -1; i--){
            let line = lines[i].replace(/ /g, '');
            line = line.replace(/\,/g, '.');
            if(line.length === 0){
                continue;
            }
            let datapoint = new Datapoint();
            
            let quantity = line.split('=')[0];
            let equation_unit = line.split('=')[1];
            let equation = equation_unit.split('\'')[0];
            let unit = equation_unit.split('\'')[1];
            
            datapoint.quantity.value = quantity;
            datapoint.equation.value = equation;
            datapoint.answer.calculation = equation;
            datapoint.answer.unit = unit;
            data.push(datapoint);
        }// end for i in lines
    };
            
    //public functions
    /**
     * Prints the calculations on screen in a div.
     * @returns {undefined}
     */
    this.print = function(){
        // empty output
        while(outputDiv.firstChild){
            outputDiv.removeChild(outputDiv.firstChild);
        }
        
        printMathJax();
        /**
        * Run the MathJax,
        * after loading, order the elements
        */
        MathJax.Hub.Queue(["Typeset",MathJax.Hub], orderMathJax, periodToComma);
        
        
        function printMathJax(){            
            //print all data on screen
            for(let i = data.length -1; i > -1; i--){
                let dp = Datapoint;
                let p = document.createElement(ELEMENTS.PARAGRAPH);
                let quant = false; 
                let eq = false; 
                let calc = false; 
                dp = data[i];

                p.id = dp.quantity.text;
                p.className = 'given';

                if(dp.quantity !== undefined){
                    let span = document.createElement(ELEMENTS.SPAN);
                    quant = true;
                    span.className = 'quantity';
                    
                    span.innerHTML = dp.quantity.printLatex;
                    p.appendChild(span);
                }

                if(dp.equation !== undefined){
                    let span = document.createElement(ELEMENTS.SPAN);
                    eq = true;
                    span.className = 'equation';
                    span.id = span.className + p.id;
                    if(quant){
                        span.innerHTML = ASCIIMATH.EQUALS;
                    }
                    span.innerHTML += dp.equation.printLatex;
                    p.appendChild(span);
                    p.className = 'equations';
                }

                if(dp.answer.calculationText !== undefined){
                    let span = document.createElement(ELEMENTS.SPAN);
                    calc = true;
                    span.className = 'calculation';
                    if(quant || eq){
                        span.innerHTML = ASCIIMATH.EQUALS;
                    }
                    span.innerHTML += dp.answer.calculationPrintLatex;
                    p.appendChild(span);
                }

                if(dp.answer !== undefined){
                    let span = document.createElement(ELEMENTS.SPAN);
                    span.className = 'answer';

                    if(quant || eq || calc){
                        span.innerHTML = ASCIIMATH.EQUALS;

                    }
                    span.innerHTML += dp.answer.printLatex;
                    p.appendChild(span);
                }

                data[i].element = p;
                outputDiv.appendChild(p);
            }
            
            
        }
        
        function orderMathJax(){
            let equations = [];
            let xRef = 10;
            let Arrow = function(currentElement, previousElement, nextElement){
                let prev = HTMLElement;
                let from = HTMLElement;
                let next = HTMLElement;
                let to = HTMLElement;
                let minGap = 5;
                let space = 3;
                
                from = currentElement.from;
                to = currentElement.to;
                
                if(previousElement !== undefined){
                    prev = previousElement.from;
                } else {
                    prev = undefined;
                }
                
                if(nextElement !== undefined){
                    next = nextElement.from;
                } else {
                     next = undefined;
                }

                
                
                this.print = function(){
                    let x1 = centerXFrom(); let y1 = yFrom() + space;
                    let x2 = leftTo();      let y2 = centerYTo();
                    
                    if(next !== undefined && isDxToSmall(next)){
                        x1 = leftFrom();
                    } else if(prev !== undefined && isDxToSmall(prev)){
                        x1 = rightFrom();
                    } 
                    
                    if(y2 > y1){
                        printUnder();
                    } else {
                        printAbove();
                    }
                    
                    function printUnder(){
                        let lineWidth = x2 - x1 + minGap - space;
                        let lineHeight = y2 - y1 + minGap;
                        let svgWidth = lineWidth + minGap ;
                        let svgHeight = lineHeight + minGap;

                        //svg drawing
                        let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        svg.setAttribute('width', svgWidth);
                        svg.setAttribute('height', svgHeight);
                        svg.style.position = 'absolute';
                        svg.style.left = (x1 - minGap) + 'px';
                        svg.style.top = (y1 - minGap) + 'px';

                        let polyline = document.createElementNS('http://www.w3.org/2000/svg','polyline');
                        polyline.setAttribute('points', minGap + ',' + minGap + ' ' + minGap + ',' + lineHeight + ' ' + lineWidth + ',' + lineHeight);
                        polyline.setAttribute('marker-end', 'url(#arrow)');
                        polyline.style.fill = 'none';
                        polyline.style.stroke = 'black';
                        polyline.style.strokeWidth = '1px';
                        
                        svg.appendChild(polyline);
                        outputDiv.appendChild(svg);
                    }
                    
                    function printAbove(){
                        y1 = yFrom(true) - space;
                        let lineWidth = x2 - x1 + minGap - space;
                        let lineHeight = y1 - y2 + minGap;
                        let svgWidth = lineWidth + minGap ;
                        let svgHeight = lineHeight + minGap;

                        //svg drawing
                        let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        svg.setAttribute('width', svgWidth);
                        svg.setAttribute('height', svgHeight);
                        svg.style.position = 'absolute';
                        svg.style.left = (x1 - minGap) + 'px';
                        svg.style.top = (y2 - minGap) + 'px';

                        let polyline = document.createElementNS('http://www.w3.org/2000/svg','polyline');
                        polyline.setAttribute('points', minGap + ',' + lineHeight + ' ' + minGap + ',' + minGap + ' ' + lineWidth + ',' + minGap);
                        polyline.style.fill = 'none';
                        polyline.style.stroke = 'black';
                        polyline.style.strokeWidth = '1px';
                        

                        svg.appendChild(polyline);
                        outputDiv.appendChild(svg);
                    }
                    
                    
                };
                
                function isDxToSmall (element){
                    let dx = Math.abs(element.getBoundingClientRect().x - from.getBoundingClientRect().x);
                    if(dx < minGap){
                        return true;
                    } else {
                        return false;
                    }
                };
                
                function leftFrom(){
                    let num = from.getBoundingClientRect().left;
                    num = Math.round(num);
                    return num;
                };
                
                function rightFrom(){
                    let num = from.getBoundingClientRect().right;
                    num = Math.round(num);
                    return num;
                };
                
                function centerXFrom(){
                    let num = (leftFrom() + rightFrom()) / 2;
                    num = Math.round(num);
                    return num;
                    
                };
                
                function yFrom(up = false){
                    let num = from.getBoundingClientRect().bottom;
                    if(up){
                        num = from.getBoundingClientRect().top;
                        
                    }
                    num = Math.round(num);
                    return num;
                };
                
                function leftTo(){
                    let num = to.getBoundingClientRect().left;
                    num = Math.round(num);
                    return num;
                };
                
                function centerYTo(){
                    let q = to.querySelector('span.quantity').getBoundingClientRect();
                    let num = (q.top + q.bottom)/2;
                    num = Math.round(num);
                    return num;
                };
            };
            let arrowRefs = [];
            
            //get the equations
            for(let i = data.length -1; i > -1; i--){
                if(data[i].equation !== undefined){
                    equations.push(data[i]);
                }
            }
            
            // link the references between the equation symbol and the given symbol
            for(let i = 0; i<equations.length; i++){
                let datapoint = equations[i];
                let refs = datapoint.referenceElements();
                let equationSpan = datapoint.element.querySelectorAll('span.equation')[0].querySelectorAll('span.mjx-msub');
                
               
                for(let j = 0; j < equationSpan.length; j++){
                    let span = equationSpan[j];
                    let base = span.querySelector('span.mjx-base');
                    let baseTextContent = base.textContent;
                    let sub = span.querySelector('span.mjx-sub');
                    let quantSym = baseTextContent;
                    
                    if(sub === null){
                        sub = '';
                    } else {
                        sub = sub.textContent;
                        quantSym += '_'+sub;
                    }
                    
                    for(let k = 0; k < refs.length; k++){
                        let ref = refs[k];
                        
                        if(toGreekLetter(ref.to.id) === quantSym && ref.from === undefined){
                            ref.from = base;
                            break;
                        }
                    } 
                } 
               
                refs.sort(function(a,b){
                    let shift = 10;
                    if(Math.abs(a.x - b.x) < 10){
                        if(a.y > b.y){
                            a.x+=shift;
                        }
                        
                        if(a.y < b.y){
                            b.x+=shift;
                        }
                    }
                    return a.x-b.x;
                });
                
                datapoint.referenceElements = refs;
                
                if(i > 0 && datapoint.element.getBoundingClientRect().left < xRef){
                    datapoint.element.style.position = 'relative';
                    datapoint.element.style.left = xRef + 'px';
                }
                
                for(let j = 0; j < refs.length; j++){
                    let ref = refs[j];
                    let xFrom = ref.from.getBoundingClientRect().right;
                    let to = ref.to;
                    if(xFrom > xRef){
                        xRef = xFrom;
                    }
                    outputDiv.insertBefore(to,datapoint.element.nextSibling);
                    
                    to.style.position = 'relative';
                    to.style.left = (5 + xFrom) + 'px';
                    
                }
                
                for(let j = 0; j < refs.length; j++){
                    let prev = refs[j-1];
                    let current = refs[j];
                    let next = refs[j+1];
                    
                    let arrow = new Arrow(current, prev, next);
                    arrowRefs.push(arrow);
                }
                
                
                
                
                
            }// end for i equations
            
            
            for(let i = 0; i < arrowRefs.length; i++){
                
                let arrow = arrowRefs[i];
                arrow.print();
            }
            
            
        }// end function orderMathJax
        
        function periodToComma(){
            let numbers = outputDiv.querySelectorAll('span.MJXc-TeX-main-R');
            
            for(let i = 0; i < numbers.length; i++){
                let numberSpan = numbers[i];
                let spanText = numberSpan.innerHTML;
                
                if(spanText.match(/\./)){
                    let commaNumber = spanText.replace(/\./, ',');
                    numberSpan.innerHTML = commaNumber;
                }
                
            }
        }
        
    };// end public solve()
    
    //private functions
    function toGreekLetter(symbol){
        let val = symbol;
        let AMsymbols = [
            //some greek symbols
            {input:'alpha',   output:'α'},
            {input:'beta',    output:'β'},
            {input:'chi',     output:'χ'},
            {input:'delta',   output:'δ'},
            {input:'Delta',   output:'Δ'},
            {input:'epsilon',    output:'ε'},
            {input:'varepsilon',  output:'ɛ'},
            {input:'eta',     output:'η'},
            {input:'gamma',   output:'γ'},
            {input:'Gamma',   output:'Γ'},
            {input:'iota',    output:'ι'},
            {input:'kappa',   output:'κ'},
            {input:'lambda',  output:'λ'},
            {input:'Lambda',  output:'Λ'},
            {input:'lamda',  output:'λ'},
            {input:'Lamda',  output:'Λ'},
            {input:'mu',      output:'μ'},
            {input:'nu',      output:'ν'},
            {input:'omega',   output:'ω'},
            {input:'Omega',   output:'Ω'},
            {input:'phi',     output:'ϕ'},
            {input:'varphi',  output:'φ'},
            {input:'Phi',     output:'Φ'},
            {input:'pi',      output:'π'},
            {input:'Pi',      output:'Π'},
            {input:'psi',     output:'ψ'},
            {input:'Psi',     output:'Ψ'},
            {input:'rho',     output:'ρ'},
            {input:'sigma',   output:'σ'},
            {input:'Sigma',   output:'Σ'},
            {input:'tau',     output:'τ'},
            {input:'theta',   output:'θ'},
            {input:'vartheta',  output:'ϑ'},
            {input:'Theta',   output:'Θ'},
            {input:'upsilon',  output:'υ'},
            {input:'xi',      output:'ξ'},
            {input:'Xi',      output:'Ξ'},
            {input:'zeta',    output:'ζ'}
        ];
        
        for(let i = 0; i < AMsymbols.length; i++){
            while(symbol.includes(AMsymbols[i].input)){
                val = val.replace(AMsymbols[i].input, AMsymbols[i].output);
                break;
            }
        }
        
        return val;
    }
    
    function filterEmptyStringFromArray(item){
        if(item !== undefined && item.length > 0){
            return item;
        }// end if
    }
    
    function exponentToMagnitude(numberExp){
        if(isNaN(numberExp)){
            return numberExp;
        }
        
        let exp = String(numberExp).match(REGEX.NUMBER_OR_EXPONENT);
        let mag = '';
        let sig = exp[0];
        let order = exp[0];
        exp = exp.filter(filterEmptyStringFromArray);
        mag = exp[0];
        
        sig = sig.replace(/\.|^0|/g, '');
        sig = sig.replace(/[eE][+-][0-9]{0,}/g, '');
        sig = sig.length;
        
        order = Math.floor(Math.log10(order));
        
        
        
        
        
        
        if(exp.length>1){
            let ex = /[eE]/;
            let ma = '*10^';
            mag = mag.replace('+', '');
            mag = mag.replace(ex,ma);
            mag = mag.replace('*10^0', '');
        } 
        
        return mag;
    }
    
    function sortByStringNumber(a,b){
        return Number(a) - Number(b);
    }
    
    function toMagnitude (numberString, reference){
        let num = Number(numberString);
        let dec = reference;
        let refMag = Math.floor(Math.log10(reference));
        let factor = Math.pow(10, -refMag);
        
        dec = dec.replace(/[eE][+-]{0,1}[0-9]{1,}$/, '');
        dec = dec.replace(/^[0-9]{1,}\./, '');
        dec = dec.length;
        
        num = num * factor;
        num = Math.round(num * Math.pow(10,dec))/Math.pow(10,dec);
        let sig = num.toString();
        
        sig = sig.replace(/[eE][+-][0-9]{0,}/g, '');
        sig = sig.replace(/\.|/g, '');
        while(sig[0]==='0'){
            sig = sig.substring(1, sig.length);
        }
        sig = sig.length;
        
        let numdec = num.toString();
        numdec = numdec.replace(/^[0-9]{1,}\./, '');
        numdec = numdec.length;
        
        if(numdec < dec){
            for(let i = dec - numdec; i > 0; i--){
                num += '0';
            }
        }
        
        if(sig !== refMag){
            num = num + '*10^' + refMag;
        } else {
            num = num * Math.pow(10, refMag);
        }
        
        
        return num;
    };
    
    function separate(text){
        let sep =  text.match(REGEX.EQUATION_SYMBOLS_ALL);
        sep = sep.filter(filterEmptyStringFromArray);
        return sep;
    }
    
    function calculate(text){
        let sep = separate(text);
        let constants = [
            {text:'pi', output:function(){
                                        let dp = Datapoint;
                                        dp = new Datapoint();
                                        dp.answer.addRange = Math.PI.toString();
                                        return dp;
                                    }}
        ];
        
        
        let functions = [
            {func:'sin'  ,output:function(a){
                    let dp = new Datapoint();
                    
                    let rangeA = [];
                    let magA = [];
                    let sigA = a.answer.significant;
                    for(let i = 0; i < a.answer.range.length; i++)  {
                        let val = Math.sin(Number(a.answer.range[i]));
                        let mag = Math.floor(Math.log10(val));
                        rangeA.push(val.toString());
                        magA.push(mag);
                    }
                    dp.answer.range = rangeA;
                    dp.answer.significant = sigA;
                    dp.answer.magnitude = magA;
                    return dp;}},
            {func:'asin' ,output:function(a){
                    let dp = new Datapoint();
                    
                    let rangeA = [];
                    let magA = [];
                    let sigA = a.answer.significant;
                    for(let i = 0; i < a.answer.range.length; i++){
                        let val = Math.asin(Number(a.answer.range[i]));
                        let mag = Math.floor(Math.log10(val));
                        rangeA.push(val.toString());
                        magA.push(mag);
                    }
                    dp.answer.range = rangeA;
                    dp.answer.significant = sigA;
                    dp.answer.magnitude = magA;
                    return dp;}},
            {func:'cos'  ,output:function(a){
                    let dp = new Datapoint();
                    
                    let rangeA = [];
                    let magA = [];
                    let sigA = a.answer.significant;
                    for(let i = 0; i < a.answer.range.length; i++){
                        let val = Math.cos(Number(a.answer.range[i]));
                        let mag = Math.floor(Math.log10(val));
                        rangeA.push(val.toString());
                        magA.push(mag);
                    }
                    dp.answer.range = rangeA;
                    dp.answer.significant = sigA;
                    dp.answer.magnitude = magA;
                    return dp;}},
            {func:'acos' ,output:function(a){
                    let dp = new Datapoint();
                    
                    let rangeA = [];
                    let magA = [];
                    let sigA = a.answer.significant;
                    for(let i = 0; i < a.answer.range.length; i++){
                        let val = Math.acos(Number(a.answer.range[i]));
                        let mag = Math.floor(Math.log10(val));
                        rangeA.push(val.toString());
                        magA.push(mag);
                    }
                    dp.answer.range = rangeA;
                    dp.answer.significant = sigA;
                    dp.answer.magnitude = magA;
                    return dp;}},
            {func:'tan'  ,output:function(a){
                    let dp = new Datapoint();
                    
                    let rangeA = [];
                    let magA = [];
                    let sigA = a.answer.significant;
                    for(let i = 0; i < a.answer.range.length; i++){
                        let val = Math.tan(Number(a.answer.range[i]));
                        let mag = Math.floor(Math.log10(val));
                        rangeA.push(val.toString());
                        magA.push(mag);
                    }
                    dp.answer.range = rangeA;
                    dp.answer.significant = sigA;
                    dp.answer.magnitude = magA;
                    return dp;}},
            {func:'atan' ,output:function(a){
                    let dp = new Datapoint();
                    
                    let rangeA = [];
                    let magA = [];
                    let sigA = a.answer.significant;
                    for(let i = 0; i < a.answer.range.length; i++){
                        let val = Math.atan(Number(a.answer.range[i]));
                        let mag = Math.floor(Math.log10(val));
                        rangeA.push(val.toString());
                        magA.push(mag);
                    }
                    dp.answer.range = rangeA;
                    dp.answer.significant = sigA;
                    dp.answer.magnitude = magA;
                    return dp;}},
            {func:'log' ,output:function(a){
                    let dp = new Datapoint();
                    
                    let rangeA = [];
                    let magA = [];
                    let sigA = a.answer.significant;
                    for(let i = 0; i < a.answer.range.length; i++){
                        let val = Math.log10(Number(a.answer.range[i]));
                        let mag = Math.floor(Math.log10(val));
                        rangeA.push(val.toString());
                        magA.push(mag);
                    }
                    dp.answer.range = rangeA;
                    dp.answer.significant = sigA;
                    dp.answer.magnitude = magA;
                    return dp;}},
            {func:'ln' ,output:function(a){
                    let dp = new Datapoint();
                    
                    let rangeA = [];
                    let magA = [];
                    let sigA = a.answer.significant;
                    for(let i = 0; i < a.answer.range.length; i++){
                        let val = Math.log(Number(a.answer.range[i]));
                        let mag = Math.floor(Math.log10(val));
                        rangeA.push(val.toString());
                        magA.push(mag);
                    }
                    dp.answer.range = rangeA;
                    dp.answer.significant = sigA;
                    dp.answer.magnitude = magA;
                    return dp;}},
            {func:'sqrt' ,output:function(a){
                    let dp = new Datapoint();
                    
                    let rangeA = [];
                    let magA = [];
                    let sigA = a.answer.significant;
                    for(let i = 0; i < a.answer.range.length; i++){
                        let val1 = Number(a.answer.range[i]);
                        let val = Math.sqrt(val1);
                        let mag = Math.floor(Math.log10(val));
                        
                        rangeA.push(val.toString());
                        magA.push(mag);
                    }
                    dp.answer.range = rangeA;
                    dp.answer.significant = sigA;
                    dp.answer.magnitude = magA;
                    return dp;}}
        ];
        let math = [
            {symbol:'^',    output:function(a,b){return power(a,b);}},
            {symbol:'root',    output:function(a,b){return root(a,b);}},
            {symbol:'/',    output:function(a,b){return division(a,b);}},
            {symbol:'*',    output:function(a,b){return multiplication(a,b);}},
            {symbol:'-',    output:function(a,b){return substraction(a,b);}},
            {symbol:'+',    output:function(a,b){return addition(a,b);}}
        ];
        
        
        for(let i = 0; i < sep.length; i++){
            let symbol = sep[i];
            
            for(let j = 0; j < data.length; j++){
                let dp = Datapoint;
                let num = Number(sep[i]);
                dp = data[j];
                
                for(let k = 0; k < constants.length; k++){
                    let constant = constants[k];
                    if(symbol === constant.text){
                        sep[i] = constant.output();
                        break;
                    }
                }
                
                
                if(symbol === dp.quantity.text){
                    sep[i] = dp;
                    break;
                }
                
                if(isNaN(num) === false){
                    let d = new Datapoint();
                    d.isInfinite = true;
                    d.answer.range.push(sep[i]);
                    d.answer.significant = [100];
                    
                    delete d.equation;
                    delete d.isFinal;
                    delete d.quantity;
                    
                    sep[i] = d;
                    break;
                }
            }
        }
        
        
        
        while(sep.indexOf('(') > -1 && sep.indexOf(')') > -1){
            let open = sep.lastIndexOf('(');
            let close = sep.indexOf(')', open);
            let sub = sep.slice(open+1, close);
            sub = calc(sub);
            sep.splice(open, close-open+1, sub);
        }
        
        
        let newSep = calc(sep);
        
        return newSep;
       
        
        function calc(array){
            //functions
            for(let i = 0; i < functions.length; i++){
                let func = functions[i].func;
                let funcdex = function(){return array.indexOf(func);};
                
                
                if(funcdex() > -1){
                    let a = array[funcdex() + 1];
                    
                    let val = functions[i].output(a);
                    array.splice(funcdex(), 2, val);
                }
            }
            
            //math
            for(let i = 0; i < math.length; i++){
                let mathSymbol = math[i].symbol;
                let symdex = function(){return array.indexOf(mathSymbol);};
                
                while(symdex() > 0){
                    let a = array[symdex() - 1];
                    let b = array[symdex() + 1];
                    
                    let val = math[i].output(a,b);
                    array.splice(symdex()-1, 3, val);
                }
            }
            return array[0];
        }
        
        function root(a,b){
            let newVal = new Datapoint();
            delete newVal.quantity;
            delete newVal.equation;
            delete newVal.isFinal;
        
            let rangeA = a.answer.range;
            let rangeB = b.answer.range;
            let sigA = a.answer.significant;
            let sigB = b.answer.significant;
            let magA = a.answer.magnitude;
            let magB = b.answer.magnitude;
            let infiniteA = a.isInfinite;
            let infiniteB = b.isInfinite;
            
            for(let i = 0; i < rangeA.length; i++){
                for(let j = 0; j < rangeB.length; j++){
                    let val1 = rangeA[i];
                    let val2 = rangeB[j];
                    let sig = sigA[i];
                    let val = Math.pow(val1,1/val2);
                    let mag = Math.floor(Math.log10(val));
                    val = val.toString();
                    newVal.answer.range.push(val);
                    newVal.answer.significant.push(sig);
                    newVal.answer.magnitude.push(mag);
                }
            }
            
            return newVal;
        }
        
        function power(a,b){
            let newVal = new Datapoint();
            delete newVal.quantity;
            delete newVal.equation;
            delete newVal.isFinal;
        
            let rangeA = a.answer.range;
            let rangeB = b.answer.range;
            let sigA = a.answer.significant;
            let sigB = b.answer.significant;
            let magA = a.answer.magnitude;
            let magB = b.answer.magnitude;
            let infiniteA = a.isInfinite;
            let infiniteB = b.isInfinite;
            
            for(let i = 0; i < rangeA.length; i++){
                for(let j = 0; j < rangeB.length; j++){
                    let val1 = rangeA[i];
                    let val2 = rangeB[j];
                    let sig = sigA[i];
                    let val = Math.pow(val1,val2);
                    let mag = Math.floor(Math.log10(val));
                    val = val.toString();
                    newVal.answer.range.push(val);
                    newVal.answer.significant.push(sig);
                    newVal.answer.magnitude.push(mag);
                }
            }
            
            return newVal;
        }
        
        function multiplication(a,b){
            let newVal = new Datapoint();
            delete newVal.quantity;
            delete newVal.equation;
            delete newVal.isFinal;
        
            let rangeA = a.answer.range;
            let rangeB = b.answer.range;
            let sigA = a.answer.significant;
            let sigB = b.answer.significant;
            let magA = a.answer.magnitude;
            let magB = b.answer.magnitude;
            let infiniteA = a.isInfinite;
            let infiniteB = b.isInfinite;
            
            for(let i = 0; i < rangeA.length; i++){
                for(let j = 0; j < rangeB.length; j++){
                    let val1 = rangeA[i];
                    let val2 = rangeB[j];
                    let sig = Math.min(sigA[i], sigB[j]);
                    let val = val1 * val2;
                    let mag = Math.floor(Math.log10(val));
                    val = val.toString();
                    newVal.answer.range.push(val);
                    newVal.answer.significant.push(sig);
                    newVal.answer.magnitude.push(mag);
                }
            }
            
            return newVal;
        }
        
        function division(a,b){
            let newVal = new Datapoint();
            delete newVal.quantity;
            delete newVal.equation;
            delete newVal.isFinal;
        
            let rangeA = a.answer.range;
            let rangeB = b.answer.range;
            let sigA = a.answer.significant;
            let sigB = b.answer.significant;
            let magA = a.answer.magnitude;
            let magB = b.answer.magnitude;
            let infiniteA = a.isInfinite;
            let infiniteB = b.isInfinite;
            
            for(let i = 0; i < rangeA.length; i++){
                for(let j = 0; j < rangeB.length; j++){
                    let val1 = rangeA[i];
                    let val2 = rangeB[j];
                    let sig = Math.min(sigA[i], sigB[j]);
                    let val = val1 / val2;
                    let mag = Math.floor(Math.log10(val));
                    val = val.toString();
                    newVal.answer.range.push(val);
                    newVal.answer.significant.push(sig);
                    newVal.answer.magnitude.push(mag);
                }
            }
            
            return newVal;
        }
        
        function addition(a,b){
            let newVal = new Datapoint();
            delete newVal.quantity;
            delete newVal.equation;
            delete newVal.isFinal;
        
            let rangeA = a.answer.range;
            let rangeB = b.answer.range;
            let sigA = a.answer.significant;
            let sigB = b.answer.significant;
            let unitA = a.answer.unit;
            let unitB = b.answer.unit;
            

            
            for(let i = 0; i < rangeA.length; i++){
                for(let j = 0; j < rangeB.length; j++){
                    let val1 = rangeA[i]; let mag1 = Math.floor(Math.log10(Math.abs(val1)));
                    let val2 = rangeB[j]; let mag2 = Math.floor(Math.log10(Math.abs(val2)));
                    let sig = Math.min(sigA[i], sigB[j]);
                    let val = Number(val1) + Number(val2);
                    let mag = Math.floor(Math.log10(Math.abs(val)));
                    let magMax = Math.max(mag1, mag2);
                    
                    
                    sig += (mag - magMax + 1);
                    
                    val = val.toString();
                    newVal.answer.range.push(val);
                    newVal.answer.significant.push(sig);
                    newVal.answer.magnitude.push(mag);
                }
            }
            
            return newVal;
        }
        
        function substraction(a,b){
            let newVal = new Datapoint();
            delete newVal.quantity;
            delete newVal.equation;
            delete newVal.isFinal;
        
            let rangeA = a.answer.range;
            let rangeB = b.answer.range;
            let sigA = a.answer.significant;
            let sigB = b.answer.significant;
            let unitA = a.answer.unit;
            let unitB = b.answer.unit;
            
            
            for(let i = 0; i < rangeA.length; i++){
                for(let j = 0; j < rangeB.length; j++){
                    let val1 = rangeA[i]; 
                    let mag1 = Math.floor(Math.log10(val1));
                    let val2 = rangeB[j]; 
                    let mag2 = Math.floor(Math.log10(val2));
                    let sig = Math.min(sigA[i], sigB[j]);
                    let val = Number(val1) - Number(val2);
                    let mag = Math.floor(Math.log10(Math.abs(val)));
                    let magMax = Math.max(mag1, mag2);

                    sig += (magMax-mag -1);
                    
                    val = val.toString();
                    newVal.answer.range.push(val);
                    newVal.answer.significant.push(sig);
                    newVal.answer.magnitude.push(mag);
                }
            }
            
            return newVal;
        }
        
        
        return ;
    }
    
    function test(){
        
    }
    
    
}// end LatexSolver