document.addEventListener('DOMContentLoaded', () => {
    const languageIcon = document.getElementById('language-icon');
    const languageDropdown = document.getElementById('language-dropdown');
    const languageOptions = document.querySelectorAll('.language-option');
    const statusElement = document.getElementById('status');
    const flipButton = document.getElementById('flip');
    const countdownElement = document.getElementById('countdown');
    const progressBar = document.getElementById('progress-bar');
    const accuracyElement = document.getElementById('signal-accuracy');
    const gameField = document.getElementById('game-field');
    const leftArrowButton = document.getElementById('left-arrow');
    const rightArrowButton = document.getElementById('right-arrow');

    let currentLanguage = 'ru';
    let isDropdownVisible = false;
    let isCooldownActive = false;
    let isGetSignalActive = false; // Флаг, активен ли процесс после нажатия на "Get Signal"
    let accuracy = '85';
    let activeStars = [];
    let cooldownEndTime = null;
    let currentTrapIndex = 1; // Начальный индекс для "3 BOMBS"
    let currentStarsCount = 0; // Переменная для хранения количества звёзд

    const trapLevels = ["1 BOMB", "3 BOMBS", "5 BOMBS", "7 BOMBS"]; // Уровни ловушек

    const translations = {
        ru: { flip: 'Получить cигнал', countdown: 'Осталось:', sec: 'сек', wait: 'ВЗЛОМ...', accuracy: 'Точность cигнала:', stars: 'ЗВЁЗД', traps: ["1 БОМБА", "3 БОМБЫ", "5 БОМБ", "7 БОМБ"] },
        en: { flip: 'Get signal', countdown: 'Remaining:', sec: 'sec', wait: 'HACKING...', accuracy: 'Signal accuracy:', stars: 'STARS', traps: ["1 BOMB", "3 BOMBS", "5 BOMBS", "7 BOMBS"] },
        hi: { flip: 'सिग्नल प्राप्त करें', countdown: 'वाम:', sec: 'सेक', wait: 'रुको...', accuracy: 'सिग्नल सटीकता:', stars: 'सितारे', traps: ["1 बम", "3 बम", "5 बम", "7 बम"] },
        pt: { flip: 'Receber sinal', countdown: 'Restante:', sec: 'seg', wait: 'AGUARDE...', accuracy: 'Precisão Do Sinal:', stars: 'ESTRELAS', traps: ["1 BOMBA", "3 BOMBAS", "5 BOMBAS", "7 BOMBAS"] },
        es: { flip: 'Recibir señal', countdown: 'Restantes:', sec: 'seg', wait: 'ESPERE...', accuracy: 'Precisión De La Señal:', stars: 'ESTRELLAS', traps: ["1 BOMBA", "3 BOMBAS", "5 BOMBAS", "7 BOMBAS"] },
        tr: { flip: 'Sinyal al', countdown: 'Kaldı:', sec: 'sn', wait: 'BEKLEYIN...', accuracy: 'Sinyal doğruluğu:', stars: 'YILDIZ', traps: ["1 BOMBA", "3 BOMBA", "5 BOMBA", "7 BOMBA"] }
    };

    // Функция для предзагрузки изображений
    function preloadImages(urls) {
        urls.forEach(url => {
            const img = new Image();
            img.src = url;
        });
    }

    // Вызываем предзагрузку изображений при загрузке страницы
    preloadImages([
        'images/cell_1.png',
        'images/cell_2.png',
        'images/star.png',
        'images/minus.png',
        'images/plus.png'
    ]);

    function getStarsText(count) {
        const lang = currentLanguage;
        if (lang === 'ru') {
            if (count % 10 === 1 && count % 100 !== 11) return 'ЗВЕЗДА';
            if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'ЗВЕЗДЫ';
            return 'ЗВЁЗД';
        }
        return translations[lang].stars;
    }

    function updateStatus() {
        if (isGetSignalActive) {
            statusElement.innerText = `${currentStarsCount} ${getStarsText(currentStarsCount)}`;
        } else {
            statusElement.innerText = translations[currentLanguage].traps[currentTrapIndex];
        }
    }

    function updateLanguage(lang) {
        const translation = translations[lang];
        if (translation) {
            flipButton.innerText = translation.flip;
            countdownElement.innerText = `${translation.countdown} 0 ${translation.sec}`;
            accuracyElement.innerText = `${translation.accuracy} ${accuracy}%`;

            if (isGetSignalActive) {
                statusElement.innerText = translation.wait; // Показываем "HACKING..." на выбранном языке
            } else if (isCooldownActive) {
                statusElement.innerText = `${currentStarsCount} ${getStarsText(currentStarsCount)}`;
            } else {
                updateStatus(); // Обновляем статус для ловушек, если взлом не активен
            }
        } else {
            console.error(`No translation found for language: ${lang}`);
        }
    }

    function toggleDropdown() {
        languageDropdown.style.display = isDropdownVisible ? 'none' : 'grid';
        isDropdownVisible = !isDropdownVisible;
    }

    languageIcon.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleDropdown();
    });

    languageOptions.forEach(option => {
        option.addEventListener('click', (event) => {
            event.preventDefault();
            const selectedLang = option.dataset.lang;
            if (translations[selectedLang]) {
                languageIcon.src = option.src;
                currentLanguage = selectedLang;
                updateLanguage(currentLanguage);
                toggleDropdown();
            } else {
                console.error(`No translation found for language: ${selectedLang}`);
            }
        });
    });

    document.addEventListener('click', (event) => {
        if (isDropdownVisible && !languageDropdown.contains(event.target) && event.target !== languageIcon) {
            toggleDropdown();
        }
    });

    const cells = Array.from({ length: 25 }, (_, i) => {
        const cell = document.createElement('div');
        cell.classList.add('cell', i % 2 === 0 ? 'cell-even' : 'cell-odd');
        gameField.appendChild(cell);
        return cell;
    });

    function updateCountdown() {
        const now = Date.now();
        const timeLeft = Math.max(0, cooldownEndTime - now);
        const secondsLeft = Math.ceil(timeLeft / 1000);

        if (timeLeft > 0) {
            const progress = 1 - timeLeft / 15000;
            progressBar.style.width = `${(1 - progress) * 100}%`;
            countdownElement.innerText = `${translations[currentLanguage].countdown} ${secondsLeft} ${translations[currentLanguage].sec}`;
            flipButton.disabled = true;
            flipButton.classList.add('disabled');
            isCooldownActive = true;
        } else {
            progressBar.style.width = '0%';
            countdownElement.innerText = `${translations[currentLanguage].countdown} 0 ${translations[currentLanguage].sec}`;
            flipButton.disabled = false;
            flipButton.classList.remove('disabled');
            isCooldownActive = false;
            if (!isGetSignalActive) { // Обновляем статус, только если взлом не активен
                updateStatus();
            }
        }
    }

    function startCountdown(seconds) {
        cooldownEndTime = Date.now() + seconds * 1000;

        function countdownInterval() {
            updateCountdown();
            if (isCooldownActive) {
                requestAnimationFrame(countdownInterval);
            }
        }

        countdownInterval();
    }

    function resetStarsWithAnimation() {
        const fadeOutDuration = 500;
        const fadeInDuration = 500;

        activeStars.forEach(cell => {
            cell.classList.add('star-fade-out');
            setTimeout(() => {
                cell.classList.remove('star', 'star-fade-out');
                cell.classList.add('fade-in');
                setTimeout(() => {
                    cell.classList.remove('fade-in', 'fade-out');
                }, fadeInDuration);
            }, fadeOutDuration);
        });
        activeStars = [];
    }

    function animateCell(cell, callback) {
        cell.classList.remove('fade-in', 'fade-out');
        cell.classList.add('fade-out');
        setTimeout(() => {
            cell.classList.remove('fade-out');
            callback();
            cell.classList.add('fade-in');
        }, 500);
    }

    function revealCells() {
        currentStarsCount = getRandomStarsForTrapLevel(); // Обновляем количество звёзд
        const randomCells = cells.sort(() => 0.5 - Math.random()).slice(0, currentStarsCount);

        updateStatus(); // Обновляем статус перед началом отображения звёзд

        let revealDelay = 0;
        randomCells.forEach((cell) => {
            setTimeout(() => {
                animateCell(cell, () => {
                    cell.classList.add('star');
                    activeStars.push(cell);
                });
            }, revealDelay);

            revealDelay += 750;
        });

        startCountdown(15);
    }

    function getRandomStarsForTrapLevel() {
        switch (trapLevels[currentTrapIndex]) {
            case "1 BOMB": return Math.floor(Math.random() * 3) + 6; // от 6 до 8 звёзд
            case "3 BOMBS": return Math.floor(Math.random() * 3) + 5; // от 5 до 7 звёзд
            case "5 BOMBS": return Math.floor(Math.random() * 3) + 3; // от 3 до 5 звёзд
            case "7 BOMBS": return Math.floor(Math.random() * 3) + 2; // от 2 до 4 звёзд
        }
    }

    flipButton.addEventListener('click', () => {
        if (isCooldownActive) return;

        flipButton.disabled = true;
        isCooldownActive = true;
        isGetSignalActive = true;
        statusElement.innerText = translations[currentLanguage].wait;

        resetStarsWithAnimation();

        setTimeout(() => {
            revealCells();
            accuracy = Math.floor(Math.random() * 14) + 86;
            accuracyElement.innerText = `${translations[currentLanguage].accuracy} ${accuracy}%`;
            isGetSignalActive = false; // Завершаем процесс "Get Signal"
        }, 1500);
    });

    leftArrowButton.addEventListener('click', () => {
        if (!isCooldownActive && !isGetSignalActive && currentTrapIndex > 0) {
            currentTrapIndex--;
            updateLanguage(currentLanguage);
        }
    });

    rightArrowButton.addEventListener('click', () => {
        if (!isCooldownActive && !isGetSignalActive && currentTrapIndex < trapLevels.length - 1) {
            currentTrapIndex++;
            updateLanguage(currentLanguage);
        }
    });

    updateLanguage(currentLanguage); // Обновляем язык в начале
});


    function showSlides(n) {
            var i;
            var slides = document.getElementsByClassName("slide");
            var dots = document.getElementsByClassName("dot");
            var slidesContainer = document.querySelector(".slides");

            if (n > slides.length) {slideIndex = 1}
            if (n < 1) {slideIndex = slides.length}
            for (i = 0; i < dots.length; i++) {
                dots[i].className = dots[i].className.replace(" active", "");
            }
            slidesContainer.style.transform = `translateX(${-(slideIndex - 1) * 100 / slides.length}%)`;
            dots[slideIndex - 1].className += " active";
        }

        function openTab(evt, tabName, button) {
            var i, tabcontent, tablinks;
            var miniModal = document.getElementById('miniModal');
            var aboutGif = document.getElementById('aboutGif');
        
            // Скрываем все вкладки и удаляем класс 'active'
            tabcontent = document.getElementsByClassName("tabcontent");
            for (i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
                tabcontent[i].classList.remove('active');
            }
        
            // Удаляем класс 'active' у всех кнопок
            tablinks = document.getElementsByClassName("tablinks");
            for (i = 0; i < tablinks.length; i++) {
                tablinks[i].classList.remove("active");
            }
        
            // Показываем текущую вкладку и добавляем класс 'active'
            document.getElementById(tabName).style.display = "flex";
            document.getElementById(tabName).classList.add('active');
            button.classList.add("active");
        
            // Скроллим страницу
            if (tabName === 'Games') {
                window.scrollTo({ top: 45, behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        
            // Обрабатываем вкладку 'About'
            if (tabName === 'About') {
                var newAboutGif = aboutGif.cloneNode(true);
                aboutGif.parentNode.replaceChild(newAboutGif, aboutGif);
                aboutGif = newAboutGif; // обновляем ссылку на новый элемент
                aboutAudio.play();
            } else {
                aboutAudio.pause();
                aboutAudio.currentTime = 0;
            }
        
            // Обрабатываем вкладку 'Contact'
            if (tabName === 'Contact') {
                miniModal.style.display = 'none';
            }
        }



        const canvas = document.getElementById('particleCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let particlesArray = [];

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 5 + 1;
                this.speedX = Math.random() * 3 - 1.5;
                this.speedY = Math.random() * 3 - 1.5;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.size > 0.2) this.size -= 0.1;
            }
            draw() {
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function init() {
            for (let i = 0; i < 100; i++) {
                particlesArray.push(new Particle());
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
                if (particlesArray[i].size <= 0.3) {
                    particlesArray.splice(i, 1);
                    i--;
                    particlesArray.push(new Particle());
                }
            }
            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });



        init();
        animate();
        const typingText = document.querySelector('.typing-text');
        const phrases = [

        ];
        let phraseIndex = 0;
        let letterIndex = 0;
        let currentPhrase = [];
        let isDeleting = false;
        let delay = 60;

        function type() {
            if (isDeleting && currentPhrase.length === 0) {
                phraseIndex = (phraseIndex + 1) % phrases.length;
                letterIndex = 0;
                isDeleting = false;
                if (phraseIndex === 0) {
                    setTimeout(type, 2000);
                    return;
                }
            } else if (!isDeleting && currentPhrase.length === phrases[phraseIndex].length) {
                isDeleting = true;
                delay = 2500;
            }

            if (isDeleting) {
                currentPhrase.pop();
                delay = 30;
            } else {
                currentPhrase.push(phrases[phraseIndex][letterIndex++]);
                delay = 120;
            }

            typingText.textContent = currentPhrase.join('');
            typingText.style.opacity = isDeleting ? 0.5 : 1;
            setTimeout(type, delay);
        }

        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(type, 2000);
        });
            $(document).ready(function () {
            for (i = 0; i < 5; i++) {
                $(".list li").clone().appendTo(".list");
            }
            $('.button').click(function () {
                $('.window').css({
                    right: "0"
                });
                $('.list li').css({
                    border: '4px solid transparent'
                });
                function selfRandom(min, max) {
                    return Math.floor(Math.random() * (max - min + 1)) + min;
                }
                var x = selfRandom(50, 100);
                $('.list li:eq('+x+')').css({
                    border: '4px solid #00ba00'
                });

                var itemWidth = 100;
                var itemMargin = 8;
                $('.window').animate({
                    right: ((x * itemWidth) + (x * itemMargin) - 119)
                }, 10000);
            });
        });
        function detectDevice() {
            var ua = navigator.userAgent;
            var deviceType;
            var deviceModel = "";

            if (/android/i.test(ua)) {
                deviceType = "Android";
                var match = ua.match(/Android.*?; (\w+)\s(\w+)\s/);
                deviceModel = match ? match[1] + " " + match[2] : "";
            } else if (/iPhone|iPad|iPod/i.test(ua)) {
                deviceType = "iOS";
                if (/iPhone/i.test(ua)) {
                    deviceModel = "iPhone";
                } else if (/iPad/i.test(ua)) {
                    deviceModel = "iPad";
                } else if (/iPod/i.test(ua)) {
                    deviceModel = "iPod";
                }
            } else {
                deviceType = "Desktop";
            }

            var output = deviceModel ? deviceType + " (" + deviceModel + ")" : deviceType;
            var deviceOutput = document.getElementById("device-output");
            deviceOutput.classList.remove("visible");
            setTimeout(function() {
                deviceOutput.textContent = output;
                deviceOutput.classList.add("visible");
            }, 10);
        }
        function triggerHapticFeedback() {
            if (navigator.vibrate) {
                navigator.vibrate(200);
            }
        }
         function startGame() {
            console.log(document.getElementById("device-output").textContent);
            if (document.getElementById("device-output").textContent.trim() === "Device not detected") {
                showModal();
            } else {
                const now = new Date().getTime();
                const lastGameTime = localStorage.getItem('lastGameTime');
                if (lastGameTime && now - lastGameTime < 60000) {
                    showMiniModal();
                    return;
                }
                var randomNumber = Math.floor(Math.random() * 5) + 1;
                var probability = Math.floor(Math.random() * 12) + 85;
                localStorage.setItem('lastGameTime', now);
                localStorage.setItem('lastGameImage', randomNumber);
                localStorage.setItem('lastProbability', probability);

                var imgContainer = document.querySelector('.image-container');
                var oldImage = imgContainer.querySelector('img');
                oldImage.style.display = 'none';

                var loaderDiv = document.createElement('div');
                loaderDiv.className = 'loader';
                imgContainer.appendChild(loaderDiv);

                setTimeout(function() {
                    loaderDiv.remove();
                    oldImage.style.display = 'block';
                    oldImage.src = randomNumber + '.png';
                    oldImage.style.marginLeft = "25px";
                }, 3000);
            }
        }



        function getGameName(imageNumber) {
            switch (imageNumber) {
                case '1':
                    return 'Mines';
                case '2':
                    return 'COLOR';
                case '3':
                    return 'chi';
                case '4':
                    return 'Bombucks';
                case '5':
                    return 'LuckyJet';
                case '6':
                    return 'Aviator';
                default:
                    return '';
            }
        }

        function closeMiniModal() {
            var miniModal = document.getElementById('miniModal');
            miniModal.style.display = 'none';
        }


        function showModal() {
            var modal = document.getElementById("modal");
            modal.style.display = 'block';
            requestAnimationFrame(() => {
                modal.classList.add("show");
            });
        }

        function closeModal() {
            var modal = document.getElementById("modal");
            modal.classList.remove("show");
            setTimeout(() => {
                modal.style.display = 'none';
            }, 500); // 500ms - время вашей CSS transition
        }

        var slideIndex = 1;
        showSlides(slideIndex);

        function plusSlides(n) {
            showSlides(slideIndex += n);
        }

        function currentSlide(n) {
            showSlides(slideIndex = n);
        }
function openGame(game) {
    triggerHapticFeedback();
    var ua = navigator.userAgent;
    var isIOS = /iPhone|iPad|iPod/i.test(ua);

    var links = {
        back: {
            ios: '../index.html',
            other: '../index.html'
        },
        mines: {
            ios: 'mines/index.html',
            other: 'mines/index.html'
        },
        nmines: {
            ios: 'nmines/index.html',
            other: 'nmines/index.html'
        },
        COLOR: {
            ios: 'COLOR/index.html',
            other: 'COLOR/index.html'
        },
        chi: {
            ios: 'chi/index.html',
            other: 'chi/index.html'
        },
        penalty: {
            ios: 'penalty/index.html',
            other: 'penalty/index.html'
        },
        mimines: {
            ios: 'mimines/index.html',
            other: 'mimines/index.html'
        },
        turboD: {
            ios: 'turboD/index.html',
            other: 'turboD/index.html'
        },
        aviator: {
            ios: 'avi/index.html',
            other: 'avi/index.html'
        },
        footballX: {
            ios: 'footx/index.html',
            other: 'footx/index.html'
        },
        coin: {
            ios: 'coinios/index.html',
            other: 'coinother/index.html'
        },
        queen: {
            ios: 'queen/index.html',
            other: 'queen/index.html'
        },
        tropicana: {
            ios: 'trop/index.html',
            other: 'trop/index.html'
        },
        crash: {
            ios: 'crash/index.html',
            other: 'crash/index.html'
        },
        bomb: {
            ios: 'bomb/index.html',
            other: 'bomb/index.html'
        },
        ball: {
            ios: 'ball/index.html',
            other: 'ball/index.html'
        },
        meta: {
            ios: 'meta/index.html',
            other: 'meta/index.html'
        },
        goal: {
            ios: 'goal/index.html',
            other: 'goal/index.html'
        },
        ast: {
            ios: 'ast/index.html',
            other: 'ast/index.html'
        },
        jet: {
            ios: 'jet/index.html',
            other: 'jet/index.html'
        },
        BURJRX: {
            ios: 'BURJRX/index.html',
            other: 'BURJRX/index.html'
        },
        indx:{
            ios: 'slot/index.html',
            other: 'slot/index.html'
        },
        cr:{
            ios: 'cr/index.html',
            other: 'cr/index.html'
        }
        };
            var url = isIOS ? links[game].ios : links[game].other;
            window.location.href = url;
        }