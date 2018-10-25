/* global math, Algebrite, MathJax 
 * */

function solve(inpt, gegeven, outpt, sign = true){
    //load library's
    /**
     * If this is true the solver wil output the end answer in the right significance and all other answers in +1 significance unrounded and ended with ...
     * @type Boolean
     */
    var significantNumbers = sign;
    /**
     * @type textarea.value gegevens
     */
    var gegevens = document.getElementById(gegeven).value;
    /**
     * 
     * @type textarea.value input
     */
    var input = document.getElementById(inpt).value;
    /**
     * 
     * @type Element    div, for LaTex
     */
    var output = document.getElementById(outpt);
    /**
     * 
     * @type Array  Lines
     */
    var lines = new Array();
    /**
     * Pakt de tekst uit gegevens en splitst deze in regels
     * @type Array  
     */
    var gegevensLines = gegevens.split('\n');
    /**
     * Gegevens uit input zijn opgesplitst in regels
     * @type Array
     */
    var inputLines = input.split('\n');
    /**
     * Text die door de calculator bereknd moet worden
     * @type String
     */
    var calcText = gegevens + '\n';
    /**
     * Is smallest significant number from gegevens
     * @type Number
     */
    var smallestSigNum = 100;
    let blocks = [];// create list of blocks
    
    laadGegevens();
    laadInput();
    printLatex();
    setTimeout(orderLatex, 500);// delay for 500 milliseconds so latex has time to form. X-poperties of printed latex are neccary
    
    function laadGegevens(){
         /*
        * laadt alle gegevens uit het gegevens veld
        */
       for(let i = 0; i < gegevensLines.length; i++){
           let line = new Line();//regel uit de gegevens
           let gegeven = gegevensLines[i].replace(/ /g, '');// haal alle spaties weg

           // als de lijn leeg is sla deze voer
           if(gegeven===''){
               continue;
           }//end if

           //splits het gegeven in een grootheid en een waarde
           line.quantity = gegeven.split('=')[0];//grootheid
           
           let anserAndUnit = gegeven.split('=')[1].split('\'');// waarde
           line.answer = anserAndUnit[0];
           if(anserAndUnit.length > 1){
               line.unit = anserAndUnit[1];
           }
           
           
           //significantie tellen
           let sigNum = line.answer;// getal
           sigNum = sigNum.replace(/[eE][-]{0,1}[0-9]{1,}/g,'');//haal de exponent weg
           sigNum = sigNum.replace(/\./g, '');//haal de punt wel
           while(sigNum.charAt(0) === '0'){
               sigNum = sigNum.substr(1);
           }// end while
           line.signNum = sigNum.length;//wijs significante waarde toe

           //check for smallest sigNum
           if(line.signNum < smallestSigNum){
               smallestSigNum = line.signNum;
           }

           //voeg gegeven aan de lijst toe
           lines.push(line);
       }// end for i
    }// end function laadGegevebs
    
    function laadInput(){
        /*
        * loop through lines
        * for loopt die elke regel van de input na gaat, 
        * achterstevoren
        */
       for(let i = inputLines.length-1; i > -1; i--){
           let inputline = inputLines[i].replace(/ /g, '');// haal alle spaties weg
           let line = new Line();// nieuwe gegevensinstantie
           // als de lijn leeg is sla deze over
           if(inputline===''){
               continue;
           }// end if

           if(i === 0){
               line.isFirst = true;
           }
           
           line.quantity = inputline.split('=')[0];// grootheid (voor de =
           
           let equationAndUnit = inputline.split('=')[1].split('\'');// formule (na de =)
           line.equation = equationAndUnit[0];
           
           if(equationAndUnit.length>1){
               line.unit = equationAndUnit[1];
           }
           
           line.answer = Number(Algebrite.run('float('+ line.calculation() +')'));
           if(isNaN(line.answer)){
               line.answer = math.eval(line.calculation());
           }
           
           lines.push(line);   
       }// end for i
    }// end function laadInput
    
    
        function printLatex(){
        emptyOutput();
        
        
        // loop through all the lines and create de latex
        for(let i = lines.length -1; i > -1; i--){
            let line = new Line();
            let p = document.createElement('p');//p-block for a line
            
            
            line = lines[i];
            p.id = 'block_' + line.quantity;
            
            /*
             * Every term is getting it's own span.
             */
            //quant
            if(line.quantity.length > 0){
                p.appendChild(spanTex(line.quantityPrint() + ' = ', 'quantity'));
            }// end if
            
            //equation
            if(line.equation.length > 0){
                p.appendChild(spanTex(line.equationPrint() + ' = ', 'equation'));
            }// end if
            
            //calculation
            if(line.calculationPrint().length > 0){
                p.appendChild(spanTex(line.calculationPrint() + ' = ', 'calculation'));
            }// end if
            
            //answer
            if(sign){
                p.appendChild(spanTex('[' + line.significantAnswer() + ',' + line.unit + ']', 'sigAnswer'));
            } else {
                p.apendChild(spanTex('[' + line.answer + ',' + line.unit + ']', 'answer'));
            }
            
            
            
            output.appendChild(p);//place on screen
            blocks.push(p);//update list of blocks
        }// end for i
        
        
        /**
        * Run the MathJax
        */
        MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
        
       
        
        
        
        function spanTex(text, eclass = '', eid = ''){
            let span = document.createElement('span');
            span.innerHTML = '`{:' + text + ':}`';
            span.className = eclass;
            if(eid.length > 0){
                span.id = eid;
            }
            
            return span;
        }

    }// end function printLatex()
    
    function orderLatex(){
        let symbolTexList = [];//list for an equation with all symbols that are quantities with a value
        for(let i = 0; i < blocks.length; i++){// loop blocks
            let block = blocks[i];
            let equationSpan = block.getElementsByClassName('equation')[0];//get the span with the equations
            
            //loop trhough blocks
            if(equationSpan !== undefined){// if there is no equation, go to the next iteration
                let equationSymbols = lines[lines.length - 1 - i].equation.match(/[a-zA-Z_]{1,}/g);//filter the symbols from the equation
                let spans = equationSpan.getElementsByTagName('span');//get all spans generated by the mathjax js

                //start search for span which only contains the symbol (not other spans)...
                for(let j = 0; j < spans.length; j++){
                    let span = spans[j];
                    let spanInner = spans[j].innerHTML;                    
                    
                    spanInner = replaceByGreek(spanInner);
                    
                    
                    if(span.className === 'mjx-base' && span.parentNode.className === 'mjx-msub'){
                        let base = replaceByGreek(span.children[0].children[0].innerHTML) + '_';
                        
                        
                        let subParendChildren = (span.parentNode.children[1].children[0].children);
                        
                        for(let k = 0; k < subParendChildren.length; k++){
                            let sub = subParendChildren[k].children[0].innerHTML;
                            base += sub;
                        }
                        
                        spanInner = base;
                    }
                    
                    
                    
                    for(let k = 0; k < equationSymbols.length; k++){// loop trough MathJax spans
                        let symbol = (equationSymbols[k]);
                        if(     symbol === 'cos' ||
                                symbol === 'sin' ||
                                symbol === 'tan' ||
                                symbol === 'acos' ||
                                symbol === 'asin' ||
                                symbol === 'atan'){
                            continue;
                        }
                        let symbolGreek = replaceByGreek(symbol);
                        if(spanInner === symbolGreek){//.. if found
                            //get coordinates from that span
                            let rect = spans[j].getBoundingClientRect();
                            let symTex = new SymbolTex();//create a new instancse which keeps track of
                            symTex.origin = spans[j];
                            symTex.quantity = symbol;//symbol
                            symTex.x = rect.right;//right side of span
                            symTex.y = rect.bottom;//bottom of span
                            //search in the blocks for the corresponding symbol
                            for(let l = 0; l < blocks.length; l++){// loop trough blocks again.
                                if(symbol === lines[blocks.length - 1 - l].quantity){
                                    symTex.block = blocks[l];
                                    break;
                                }// end if
                            }// end for l
                            
                            symbolTexList.push(symTex);//put 
                            break;
                        }// end if
                        
                    }// end for k
                }// end for j
                
                symbolTexList.sort(compare);// sort the list on x
                //we are still looping firstly through the equation, and keeping track of the symbols
                
                //now load the instance that was keeping track
                for(let j = 0; j < symbolTexList.length; j++){
                    let x = symbolTexList[j].x;//get x
                    let y = symbolTexList[j].y;// gety
                    let p = symbolTexList[j];// and get neccecery block
                    let b = document.getElementById('block_' + p.quantity);
                    block.parentNode.insertBefore(b, b.nextSibling);//and place it in the right order
                    b.style.position = 'relative';
                    b.style.left = (x + 10) + 'px';// a bit more to the right
                }// end for j
                
            }// end if

        }// end for i (loop trough equations
        
        
        //draw arrows
        for(let i = 0; i < symbolTexList.length; i++){
            let startElement = symbolTexList[i].origin.getBoundingClientRect();
            let endElement = symbolTexList[i].block.getBoundingClientRect();
            let dxNext = 6;
            let dxPrev = 6;
            if(i < symbolTexList.length -1){
                dxNext = symbolTexList[i+1].origin.getBoundingClientRect().x - startElement.x;
            }
            
            if(i > 0){
                dxPrev = startElement.x - symbolTexList[i-1].origin.getBoundingClientRect().x;
            }
            
            
            
            
            let x1 = startElement.left + startElement.width/2;
            let x2 = endElement.left;
            let y1 = startElement.bottom;
            let y2 = (endElement.bottom + endElement.top)/2;
            
            if(dxNext < 5){
                x1 = startElement.left;
            }
            
            if(dxPrev < 5){
                x1 = startElement.right;
            }
            
            let w = Math.round(x2 - x1);
            let h = Math.round(y2 - y1);
                        
            let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', Math.round(endElement.left));
            svg.setAttribute('height', Math.round(endElement.y));
            svg.style.position = 'absolute';
            svg.style.left = x1 + 'px';
            svg.style.top = y1 + 'px';
            
            let polyline = document.createElementNS('http://www.w3.org/2000/svg','polyline');
            polyline.setAttribute('points', '1,1 1,' + h + ' ' + w + ',' + h);
            polyline.setAttribute('marker-end', 'url(#arrow)');
            
            svg.appendChild(polyline);
            output.appendChild(svg);
        }// end for i 
        
    }// end function orderLatex
    
    /**
     * Removes all elements from output
     */
    function emptyOutput(){
        while(output.firstChild){
            output.removeChild(output.firstChild);
        }// end while
    }// end function emptyOutput()
    
    function compare(a,b) {
        if (a.x < b.x){
            return -1;
        }
        
        if (a.x > b.x){
            return 1;
        }
          
        return 0;
    }
    
    function Line(){
        this.quantity = '';
        this.quantityPrint = function(){
            if(this.quantity.match('_')){
                let subs = this.quantity.split('_');
                let newQuantity = subs[0];
                
                for(let i = 1; i < subs.length; i++){
                    newQuantity += '_('+subs[i]+')';
                }// end for i
                
                return '{:' + newQuantity + ':}';
            } else {
                return '{:' + this.quantity + ':}';
            }
            
        };
        this.equation = '';
        this.equationPrint = function(){
            let parts = this.equation.match(/[0-9a-zA-Z_\\\.]{1,}|[\+\-\*\/\^\(\)]/g);
            let newEquation = '';
            for(let i = 0; i < parts.length; i++){
                let part = parts[i];
                if(part.match('_')){
                    let subs = part.split('_');
                    let newPart = subs[0];
                    for(let j = 1; j < subs.length; j++){
                        newPart += '_{:' + subs[j] + ':}';
                    }
                    newEquation += newPart;
                } else {
                    if(part.match(/[0-9a-zA-Z_\\\.]{1,}/)){
                        part = '{:' + part + ':}';
                    }
                    
                    newEquation += part ;
                }
            }
            
            
                
            
            newEquation = newEquation.replace(/(\{\:sqrt\:\})/g, 'sqrt');
            newEquation = newEquation.replace(/(\{\:cos\:\})/g, 'cos');
            newEquation = newEquation.replace(/(\{\:sin\:\})/g, 'sin');
            newEquation = newEquation.replace(/(\{\:tan\:\})/g, 'tan');
            newEquation = newEquation.replace(/(\{\:acos\:\})/g, 'arccos');
            newEquation = newEquation.replace(/(\{\:asin\:\})/g, 'arcsin');
            newEquation = newEquation.replace(/(\{\:atan\:\})/g, 'arctan');
            return '{:' + newEquation + ':}';
        };
        this.calculation = function(){
            let calc = '';
            //for future development, can be split in lids
            let symbols = this.equation.match(/[0-9a-zA-Z_\\\.]{1,}|[\+\-\*\/\^\(\)]/g);
            
            for(let i in symbols){
                let symbol = symbols[i];
                
                if(symbol.match(/[\+\-\*\/\^\(\)]|[0-9\.]{1,}/)){
                    
                } else {
                    for(let j = lines.length - 1; j > -1; j--){
                        let line = lines[j];
                        if(symbol === line.quantity){
                            let newAnswer = line.answer.toString();
                            newAnswer = newAnswer.replace(/e\+/g, '*10^');
                            newAnswer = newAnswer.replace(/e\-/g, '*10^-');
                            symbols.splice(i,1, newAnswer);
                            
                        }// end if
                    }//end for(let line in lines){
                    
                    
                }// end ifelse
                calc += symbols[i];
            }// end for(let symbol in symbols){
                
            return calc;
        };
        this.calculationPrint = function(){
            let calc = '';
            //for future development, can be split in lids
            let symbols = this.equation.match(/[0-9a-zA-Z_\\\.]{1,}|[\+\-\*\/\^\(\)]/g);
            var pow = false;
            
            if(symbols === null){
                return calc;
            }
            
            for(let i = 0; i < symbols.length; i++){
                let symbol = symbols[i];
                
                if(symbol.match(/[\+\-\*\/\^\(\)]|[0-9\.]{1,}/)){
                    if(symbol=== '^'){
                        let pow = '(' + symbols[i-1] + ')';
                        symbols.splice(i-1, 1, pow);
                    }
                } else {
                    for(let j = lines.length - 1; j > -1; j--){
                        let line = new Line();
                        line = lines[j];
                        if(symbol === line.quantity){
                            let newAnswer = '{:' + line.significantAnswer() + ':}';
                            
                            symbols.splice(i,1, newAnswer);
                            
                        }// end if
                    }//end for j (let line in lines){
                    
                    
                }// end ifelse
                                
                
            }// end for i (let symbol in symbols){
           
           for(let i = 0; i < symbols.length; i++){
               calc += symbols[i];
           }
            calc = calc.replace(/sqrtg/, 'sqrt');
            calc = calc.replace(/cos/g, 'cos');
            calc = calc.replace(/sin/g, 'sin');
            calc = calc.replace(/tan/g, 'tan');
            calc = calc.replace(/acos/g, 'arccos');
            calc = calc.replace(/asin/g, 'arcsin');
            calc = calc.replace(/atan/g, 'arctan');
            
            return calc;
        };
        this.answer = new Number();
        this.isFirst = false;
        this.signNum = 100;
        this.prefix = '';
        this.magnitude = 0;
        this.unit = '';
        this.significantAnswer = function(){
            let sig = smallestSigNum;
            let mag = 0;
            
            if(this.equation < 1){
                sig = this.signNum-1;
            }
            
            if(this.isFirst){
                sig--;
            }
            
            
            let sigAns = (Number(this.answer).toExponential(sig));
            sigAns = sigAns.replace('e+0', '');
            sigAns = sigAns.replace('+', '');
            sigAns = sigAns.replace('e', '*10^');
            if(sigAns.split('\^').length > 1){
                mag = Number(sigAns.split('^')[1]);
                if(mag - sig === 0){
                    sigAns = (Number(this.answer).toFixed());
                }
                
                
            }
            
            return sigAns;
        };
        this.latex = function(){
            let full = '`';
            let par = document.createElement('p');
            
            //if quantity is given
            if(this.quantity.length > 0){
                full += this.quantity + ' = ';
            }// end if
            
            //if there is an equeation
            if(this.equation.length > 0){
                full += this.equation;
            }// end if
            
            //if there is an calculation
            if(this.calculation.length > 0){
                full += ' = ' + this.calculation;
            }// end if
            
            //check if answer is going to be significant notated or not
            if(significantNumbers){
                full += ' = ' + this.significantAnswer();
            } else {
                full += ' = ' + this.answer;
            }
            
            
            full += '`';
            par.innerHTML = full;
            return par;
        };
        this.elements = function(){
            return this.equation.match(/[a-zA-Z_]{1,}/g);
        };        
    };// end function Line
    
    function SymbolTex(){
        this.quantity = '';
        this.x = new Number();
        this.y = new Number();
        this.width = new Number();
        this.height = new Number();
        this.block = Element;
        this.origin = Element;
    }
    
    function replaceByGreek(word){
        let greekLetter = '';
        
        switch (word){
            
            case 'gamma':
                greekLetter = 'γ';
                break;
            
            case 'rho':
                greekLetter = 'ρ';
                break;
            
            default: 
                greekLetter = word;
                break;
        }
        
        
        return greekLetter;
    }
    
}// end function solve
