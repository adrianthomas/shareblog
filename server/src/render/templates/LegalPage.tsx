import React from "react";

function AnalyticsNotice({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return (
      <>
        <p><strong>Status: Reichweitenmessung deaktiviert.</strong></p>
        <p>
          Auf dieser Website werden derzeit keine Seitenaufrufe für eine Reichweitenstatistik erfasst. Referrer,
          IP-Adresse und User-Agent werden nicht für statistische Zwecke ausgewertet oder in einer
          Analysedatenbank gespeichert. Beim Deaktivieren der Statistik wurden zuvor gespeicherte aggregierte
          Zähler unwiderruflich gelöscht.
        </p>
      </>
    );
  }

  return (
    <>
      <p><strong>Status: Reichweitenmessung aktiviert.</strong></p>
      <p>
        Diese Website verwendet eine eigene, ausschließlich serverseitige und datensparsame Reichweitenmessung.
        Bei einem erfolgreichen Abruf einer öffentlichen HTML-Seite mit der Methode GET wird unmittelbar ein
        aggregierter Zähler erhöht. Nicht gezählt werden insbesondere Feeds, statische Dateien, Weiterleitungen,
        Fehlerseiten, HEAD-Anfragen, erkannte Bots und Vorschau-Dienste sowie Prefetch- und Prerender-Anfragen.
        Auch Anfragen mit aktiviertem Do Not Track (DNT) oder Global Privacy Control (GPC) werden nicht gezählt.
      </p>
      <p>
        Gespeichert werden ausschließlich die Anzahl der Seitenaufrufe, der UTC-Kalendertag, bei Artikeln der
        aufgerufene Artikel und eine grobe Herkunftskategorie. Diese Kategorien sind direkter Aufruf,
        Suchmaschinen, Mastodon, Bluesky, Facebook, LinkedIn, Reddit, Hacker News, sonstige Websites und interne
        Navigation. Interne Navigation fließt in die Gesamtzahl ein, wird aber nicht in der Herkunftsübersicht
        angezeigt.
      </p>
      <p>
        Eine gegebenenfalls übermittelte Referrer-URL wird nur flüchtig im Arbeitsspeicher einer Kategorie
        zugeordnet. Die vollständige Referrer-URL und ihr Pfad werden nicht gespeichert. Für die Statistik werden
        weder IP-Adresse noch User-Agent, Cookie, Besucher- oder Sitzungskennung gespeichert. Es gibt keine
        Wiedererkennung einzelner Personen, keine Zusammenführung über Websites oder Geräte hinweg und keine
        Weitergabe der Statistik an einen Analysedienst. Aus den gespeicherten Daten lässt sich nicht ablesen, wer
        eine Seite besucht hat.
      </p>
      <p>
        Rechtsgrundlage für die dabei stattfindende, kurzzeitige Verarbeitung ist Art. 6 Abs. 1 lit. f DSGVO. Das
        berechtigte Interesse besteht darin, die Nutzung und Auffindbarkeit der veröffentlichten Inhalte anhand
        möglichst datenarmer, nicht personenbezogener Ergebnisdaten zu verstehen. Die beschriebenen Maßnahmen
        begrenzen den Eingriff auf das dafür erforderliche Minimum. Die aggregierten Zähler bleiben gespeichert,
        solange die Reichweitenmessung aktiviert ist. Wird sie deaktiviert, werden sämtliche Zähler dieser Website
        unwiderruflich gelöscht und es werden keine neuen Zähler angelegt.
      </p>
      <p>
        Einer künftigen Zählung kann technisch durch das Senden von DNT&nbsp;=&nbsp;1 oder GPC widersprochen werden.
        Ein Widerspruch kann außerdem über die unten angegebene E-Mail-Adresse erklärt werden. Da keine
        Besucherkennung geführt wird, können bereits aggregierte Seitenaufrufe keiner Person zugeordnet oder
        nachträglich einzeln herausgerechnet werden.
      </p>
    </>
  );
}

export function LegalPage({ statsEnabled }: { statsEnabled: boolean }) {
  return (
    <article className="about-page imprint-page">
      <h1>Legal</h1>
      <div className="about-content">
        <h2>Impressum</h2>
        <p>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</p>
        <address>
          Adrian Thomas<br />
          Lärchenweg 68<br />
          85757 Karlsfeld<br />
          Deutschland
        </address>

        <h3>Kontakt</h3>
        <p>
          E-Mail: <a href="mailto:hello@adrianthomas.com">hello@adrianthomas.com</a>
        </p>

        <h3>Redaktionell verantwortlich gemäß § 18 Abs. 2 MStV</h3>
        <address>
          Adrian Thomas<br />
          Lärchenweg 68<br />
          85757 Karlsfeld<br />
          Deutschland
        </address>

        <h3>Haftung für Inhalte und Links</h3>
        <p>
          Für eigene Inhalte auf diesen Seiten gelten die allgemeinen Gesetze. Diese Website enthält außerdem
          Links zu externen Websites, auf deren Inhalte kein Einfluss besteht. Für die Inhalte der verlinkten
          Seiten ist stets der jeweilige Anbieter verantwortlich. Werden konkrete Rechtsverletzungen bekannt,
          werden betroffene Inhalte oder Links unverzüglich geprüft und gegebenenfalls entfernt.
        </p>

        <h3>Urheberrecht</h3>
        <p>
          Die vom Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
          Urheberrecht. Vervielfältigung, Bearbeitung, Verbreitung und Verwertung außerhalb der gesetzlichen
          Schranken bedürfen der Zustimmung des jeweiligen Rechteinhabers. Inhalte Dritter werden als solche
          gekennzeichnet. Hinweise auf mögliche Urheberrechtsverletzungen können an die oben genannte
          E-Mail-Adresse gesendet werden.
        </p>

        <h2>Datenschutzerklärung</h2>
        <p>Informationen zur Verarbeitung personenbezogener Daten gemäß Art. 13 DSGVO.</p>

        <h3>Verantwortlicher</h3>
        <address>
          Adrian Thomas<br />
          Lärchenweg 68<br />
          85757 Karlsfeld<br />
          Deutschland<br />
          E-Mail: <a href="mailto:hello@adrianthomas.com">hello@adrianthomas.com</a>
        </address>

        <h3>Bereitstellung der Website und Hosting</h3>
        <p>
          Beim Aufruf einer Website muss die IP-Adresse technisch verarbeitet werden, damit die angeforderten
          Inhalte an das Endgerät übertragen werden können. Der Server verwendet die IP-Adresse außerdem
          vorübergehend zur Begrenzung missbräuchlich vieler Anfragen. Diese Website wird bei Uberspace gehostet.
          Uberspace verarbeitet die für den technischen Betrieb erforderlichen Daten als Hosting-Anbieter. Die
          Anwendung selbst schwärzt IP-Adressen und Ports in ihren Protokollen; Referrer und User-Agent werden dort
          nicht als Teil eines Besucherprofils protokolliert. Nach Angaben von Uberspace sind Webserver-Zugriffslogs
          standardmäßig deaktiviert. Falls sie aktiviert werden, enthalten sie nur gekürzte IP-Adressen, werden
          täglich rotiert und nach sieben Tagen gelöscht.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Die berechtigten Interessen sind die sichere,
          zuverlässige und missbrauchsgeschützte Bereitstellung der Website. Betriebs- und Fehlerprotokolle werden
          nur so lange aufbewahrt, wie sie für Fehlerdiagnose, Sicherheit und den technischen Betrieb erforderlich
          sind. Uberspace stellt für eine Verarbeitung im Auftrag einen Vertrag zur Auftragsverarbeitung nach Art. 28
          DSGVO bereit.
        </p>

        <h3>Reichweitenmessung</h3>
        <AnalyticsNotice enabled={statsEnabled} />

        <h3>Cookies, externe Dienste und eingebettete Inhalte</h3>
        <p>
          Die öffentlichen Seiten setzen keine Cookies und verwenden keine Analyse-, Werbe- oder Social-Media-
          Skripte. Schriftarten, Bilder und andere Seitenelemente werden lokal ausgeliefert. Erst wenn ein externer
          Link bewusst geöffnet wird, verarbeitet der Betreiber der Zielseite den dortigen Abruf nach seinen
          eigenen Datenschutzbestimmungen.
        </p>

        <h3>Empfänger und Drittlandübermittlungen</h3>
        <p>
          Empfänger technisch erforderlicher Daten ist der Hosting-Anbieter im Rahmen des Hostings. Die
          Reichweitenstatistik wird nicht an Dritte übermittelt. Durch den Betrieb dieser öffentlichen Website und
          ihrer Reichweitenmessung findet keine beabsichtigte Übermittlung personenbezogener Daten in ein Drittland
          statt.
        </p>

        <h3>Ihre Rechte</h3>
        <p>
          Soweit die gesetzlichen Voraussetzungen vorliegen, bestehen Rechte auf Auskunft, Berichtigung, Löschung,
          Einschränkung der Verarbeitung und Datenübertragbarkeit. Einer Verarbeitung auf Grundlage von Art. 6
          Abs. 1 lit. f DSGVO kann aus Gründen widersprochen werden, die sich aus der besonderen Situation der
          betroffenen Person ergeben. Anfragen können an die oben angegebene E-Mail-Adresse gerichtet werden.
        </p>
        <p>
          Außerdem besteht das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren. Zuständig ist
          insbesondere das Bayerische Landesamt für Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach,
          Deutschland; <a href="https://www.lda.bayern.de/">www.lda.bayern.de</a>.
        </p>

        <p><small>Stand: 12. September 2026</small></p>
      </div>
    </article>
  );
}
